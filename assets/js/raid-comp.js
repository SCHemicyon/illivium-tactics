/* =========================================
   CONFIGURATION GÉNÉRALE
========================================= */

const GROUP_COUNT = 8;
const SLOTS_PER_GROUP = 5;
const MAX_PLAYERS = GROUP_COUNT * SLOTS_PER_GROUP;

const STORAGE_KEY = "illiviumRaidComposition";
const SHARE_PARAMETER = "comp";

/* =========================================
   ÉTAT DE L’APPLICATION
========================================= */

let data = null;

let raidComposition = createEmptyComposition();

let draggedSlotIndex = null;
let draggedSpec = null;

let messageTimeout = null;

/* =========================================
   INITIALISATION
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  generateRaidGroups();
  attachActionEvents();

  try {
    data = await loadClassesData();

    generateSpecPicker();
    loadCompositionFromUrlOrStorage();
    renderComposition();
  } catch (error) {
    console.error(error);

    showMessage(
      "Impossible de charger classes.json.",
      "error",
    );

    renderComposition();
  }
});

/* =========================================
   CHARGEMENT DE CLASSES.JSON
========================================= */

async function loadClassesData() {
  const response = await fetch("../data/classes.json");

  if (!response.ok) {
    throw new Error(
      `Impossible de charger classes.json : ${response.status}`,
    );
  }

  const loadedData = await response.json();

  if (
    !loadedData.paths ||
    !loadedData.roles ||
    !Array.isArray(loadedData.classes)
  ) {
    throw new Error(
      "La structure de classes.json est invalide.",
    );
  }

  return loadedData;
}

/* =========================================
   COMPOSITION VIDE
========================================= */

function createEmptyComposition() {
  return Array.from(
    {
      length: MAX_PLAYERS,
    },
    () => null,
  );
}

/* =========================================
   CONSTRUCTION DES CHEMINS D’IMAGES
========================================= */

function buildAssetPath(category, filename) {
  if (!filename || !data?.paths) {
    return "";
  }

  const basePath = String(data.paths.base || "").replace(
    /\/$/,
    "",
  );

  const categoryPath = String(
    data.paths[category] || "",
  ).replace(/^\/|\/$/g, "");

  if (!categoryPath) {
    return `${basePath}/${filename}`;
  }

  return `${basePath}/${categoryPath}/${filename}`;
}

/* =========================================
   GÉNÉRATION DES GROUPES
========================================= */

function generateRaidGroups() {
  const groupsWrapper =
    document.querySelector("#groupsWrapper");

  if (!groupsWrapper) {
    return;
  }

  groupsWrapper.innerHTML = Array.from(
    {
      length: GROUP_COUNT,
    },
    (_, groupIndex) => {
      const groupNumber = groupIndex + 1;

      const slots = Array.from(
        {
          length: SLOTS_PER_GROUP,
        },
        (_, slotIndex) => {
          const globalSlotIndex =
            groupIndex * SLOTS_PER_GROUP + slotIndex;

          return `
            <div
              class="slot"
              data-group="${groupNumber}"
              data-slot="${slotIndex + 1}"
              data-slot-index="${globalSlotIndex}"
            >
              Vide
            </div>
          `;
        },
      ).join("");

      return `
        <article
          class="group"
          data-group-id="${groupNumber}"
        >
          <h3>Groupe ${groupNumber}</h3>

          <div class="groupSlots">
            ${slots}
          </div>
        </article>
      `;
    },
  ).join("");

  attachSlotEvents();
}

/* =========================================
   ÉVÉNEMENTS DES EMPLACEMENTS
========================================= */

function attachSlotEvents() {
  document.querySelectorAll(".slot").forEach((slot) => {
    slot.addEventListener(
      "dragover",
      handleSlotDragOver,
    );

    slot.addEventListener(
      "dragleave",
      handleSlotDragLeave,
    );

    slot.addEventListener(
      "drop",
      handleSlotDrop,
    );
  });
}

/* =========================================
   SURVOL D’UN EMPLACEMENT PENDANT UN DRAG
========================================= */

function handleSlotDragOver(event) {
  event.preventDefault();

  const slot = event.currentTarget;
  const slotIndex = Number(slot.dataset.slotIndex);

  if (
    draggedSpec &&
    raidComposition[slotIndex] !== null
  ) {
    slot.classList.remove("dragOver");
    slot.classList.add("dragBlocked");

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "none";
    }

    return;
  }

  slot.classList.remove("dragBlocked");
  slot.classList.add("dragOver");

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect =
      draggedSpec ? "copy" : "move";
  }
}

/* =========================================
   SORTIE DU SURVOL D’UN EMPLACEMENT
========================================= */

function handleSlotDragLeave(event) {
  event.currentTarget.classList.remove(
    "dragOver",
    "dragBlocked",
  );
}

/* =========================================
   DÉPÔT DANS UN EMPLACEMENT
========================================= */

function handleSlotDrop(event) {
  event.preventDefault();

  const targetSlot = event.currentTarget;

  const targetSlotIndex = Number(
    targetSlot.dataset.slotIndex,
  );

  targetSlot.classList.remove(
    "dragOver",
    "dragBlocked",
  );

  if (Number.isNaN(targetSlotIndex)) {
    clearDragState();
    return;
  }

  if (draggedSpec) {
    addDraggedSpecToSlot(targetSlotIndex);
    clearDragState();
    return;
  }

  if (draggedSlotIndex !== null) {
    movePlayerToSlot(targetSlotIndex);
    clearDragState();
  }
}

/* =========================================
   NETTOYAGE DU DRAG AND DROP
========================================= */

function clearDragState() {
  draggedSlotIndex = null;
  draggedSpec = null;

  document.querySelectorAll(".slot").forEach((slot) => {
    slot.classList.remove(
      "dragOver",
      "dragBlocked",
    );
  });

  document
    .querySelectorAll(".specButton")
    .forEach((button) => {
      button.classList.remove("dragging");
    });
}

/* =========================================
   DÉPLACEMENT OU ÉCHANGE DE JOUEURS
========================================= */

function movePlayerToSlot(targetSlotIndex) {
  if (
    draggedSlotIndex === null ||
    draggedSlotIndex === targetSlotIndex
  ) {
    return;
  }

  const draggedPlayer =
    raidComposition[draggedSlotIndex];

  const targetPlayer =
    raidComposition[targetSlotIndex];

  raidComposition[targetSlotIndex] =
    draggedPlayer;

  raidComposition[draggedSlotIndex] =
    targetPlayer;

  renderComposition();
}

/* =========================================
   AJOUT DIRECT D’UNE SPÉCIALISATION
========================================= */

function addDraggedSpecToSlot(targetSlotIndex) {
  if (!draggedSpec) {
    return;
  }

  if (raidComposition[targetSlotIndex] !== null) {
    showMessage(
      "Cet emplacement est déjà occupé.",
      "error",
    );

    return;
  }

  const player = createPlayerFromSpec(
    draggedSpec.classId,
    draggedSpec.specId,
  );

  if (!player) {
    showMessage(
      "Spécialisation introuvable.",
      "error",
    );

    return;
  }

  raidComposition[targetSlotIndex] = player;

  renderComposition();
}

/* =========================================
   GÉNÉRATION DE LA PALETTE DE SPÉCIALISATIONS
========================================= */

function generateSpecPicker() {
  const specPicker =
    document.querySelector("#specPicker");

  if (!specPicker || !data) {
    return;
  }

  specPicker.innerHTML = data.classes
    .map((classData) => {
      const specButtons = classData.specs
        .map((spec) => {
          const specIconPath = buildAssetPath(
            "specs",
            spec.specIcon,
          );

          return `
            <button
              class="specButton"
              type="button"
              draggable="true"
              data-class-id="${classData.id}"
              data-spec-id="${spec.id}"
              title="${escapeAttribute(
                `${classData.name} - ${spec.name}`,
              )}"
            >
              <img
                src="${escapeAttribute(specIconPath)}"
                alt="${escapeAttribute(spec.name)}"
                draggable="false"
              />
            </button>
          `;
        })
        .join("");

      return `
        <div
          class="classSection"
          style="border-color: ${escapeAttribute(
            classData.color,
          )}"
        >
          <div class="specList">
            ${specButtons}
          </div>
        </div>
      `;
    })
    .join("");

  specPicker
    .querySelectorAll(".specButton")
    .forEach((button) => {
      button.addEventListener("click", () => {
        addPlayerFromSpec(
          Number(button.dataset.classId),
          Number(button.dataset.specId),
        );
      });

      button.addEventListener(
        "dragstart",
        (event) => {
          handleSpecDragStart(event, button);
        },
      );

      button.addEventListener(
        "dragend",
        clearDragState,
      );
    });
}

/* =========================================
   DÉBUT DU DRAG D’UNE SPÉCIALISATION
========================================= */

function handleSpecDragStart(event, button) {
  const classId = Number(
    button.dataset.classId,
  );

  const specId = Number(
    button.dataset.specId,
  );

  draggedSlotIndex = null;

  draggedSpec = {
    classId,
    specId,
  };

  button.classList.add("dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "copy";

    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: "specialization",
        classId,
        specId,
      }),
    );
  }
}

/* =========================================
   RECHERCHE D’UNE SPÉCIALISATION PAR ID
========================================= */

function findClassAndSpecBySpecId(specId) {
  if (!data?.classes) {
    return null;
  }

  for (const classData of data.classes) {
    const spec = classData.specs.find(
      (currentSpec) =>
        Number(currentSpec.id) === Number(specId),
    );

    if (spec) {
      return {
        classData,
        spec,
      };
    }
  }

  return null;
}

/* =========================================
   CRÉATION D’UN JOUEUR DEPUIS UNE SPÉ
========================================= */

function createPlayerFromSpec(
  classId,
  specId,
  playerName = "Joueur",
) {
  const classData = data.classes.find(
    (currentClass) =>
      Number(currentClass.id) === Number(classId),
  );

  const spec = classData?.specs.find(
    (currentSpec) =>
      Number(currentSpec.id) === Number(specId),
  );

  if (!classData || !spec) {
    return null;
  }

  return createPlayerObject(
    classData,
    spec,
    playerName,
  );
}

/* =========================================
   CRÉATION D’UN JOUEUR DEPUIS UN SPEC ID
========================================= */

function createPlayerFromSpecId(
  specId,
  playerName = "Joueur",
) {
  const result = findClassAndSpecBySpecId(specId);

  if (!result) {
    return null;
  }

  return createPlayerObject(
    result.classData,
    result.spec,
    playerName,
  );
}

/* =========================================
   CONSTRUCTION DE L’OBJET JOUEUR
========================================= */

function createPlayerObject(
  classData,
  spec,
  playerName,
) {
  return {
    instanceId: createUniqueId(),

    name: playerName || "Joueur",

    classId: classData.id,
    className: classData.name,
    classColor: classData.color,

    specId: spec.id,
    specName: spec.name,
    specIcon: spec.specIcon,

    role: spec.role,
  };
}

/* =========================================
   AJOUT AU PREMIER EMPLACEMENT VIDE
========================================= */

function addPlayerFromSpec(classId, specId) {
  const emptySlotIndex =
    raidComposition.findIndex(
      (player) => player === null,
    );

  if (emptySlotIndex === -1) {
    showMessage(
      "Tous les emplacements sont occupés.",
      "error",
    );

    return;
  }

  const player = createPlayerFromSpec(
    classId,
    specId,
  );

  if (!player) {
    showMessage(
      "Spécialisation introuvable.",
      "error",
    );

    return;
  }

  raidComposition[emptySlotIndex] = player;

  renderComposition();
}

/* =========================================
   RENDU GLOBAL
========================================= */

function renderComposition() {
  renderSlots();
  updateRoleCounts();
  updateClassCounts();
  updateSpellLists();
}

/* =========================================
   AFFICHAGE DES JOUEURS
========================================= */

function renderSlots() {
  document.querySelectorAll(".slot").forEach((slot) => {
    const slotIndex = Number(
      slot.dataset.slotIndex,
    );

    const player =
      raidComposition[slotIndex];

    slot.classList.remove(
      "filled",
      "dragOver",
      "dragBlocked",
    );

    slot.style.borderColor = "";

    if (!player) {
      slot.textContent = "Vide";
      slot.draggable = false;

      return;
    }

    const role =
      data.roles[player.role];

    if (!role) {
      console.error(
        `Rôle introuvable dans classes.json : ${player.role}`,
      );

      slot.textContent = "Erreur de rôle";
      return;
    }

    const roleIconPath = buildAssetPath(
      "roles",
      role.icon,
    );

    const specIconPath = buildAssetPath(
      "specs",
      player.specIcon,
    );

    slot.classList.add("filled");
    slot.draggable = true;

    slot.style.borderColor =
      player.classColor;

    slot.innerHTML = `
      <div class="playerCard">
        <img
          class="roleIcon"
          src="${escapeAttribute(roleIconPath)}"
          alt="${escapeAttribute(role.name)}"
          title="${escapeAttribute(role.name)}"
          draggable="false"
        />

        <img
          class="specIcon"
          src="${escapeAttribute(specIconPath)}"
          alt="${escapeAttribute(
            player.specName,
          )}"
          title="${escapeAttribute(
            `${player.className} - ${player.specName}`,
          )}"
          draggable="false"
        />

        <span
          class="playerName"
          title="Double-cliquez pour modifier le nom"
        >
          ${escapeHtml(player.name)}
        </span>

        <button
          class="removePlayer"
          type="button"
          aria-label="Supprimer ${escapeAttribute(
            player.name,
          )}"
          title="Supprimer"
        >
          ×
        </button>
      </div>
    `;

    slot.addEventListener(
      "dragstart",
      (event) => {
        draggedSpec = null;
        draggedSlotIndex = slotIndex;

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed =
            "move";

          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              type: "player",
              slotIndex,
            }),
          );
        }
      },
    );

    slot.addEventListener(
      "dragend",
      clearDragState,
    );

    slot
      .querySelector(".playerName")
      ?.addEventListener(
        "dblclick",
        () => {
          startPlayerNameEdition(
            slotIndex,
          );
        },
      );

    slot
      .querySelector(".removePlayer")
      ?.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          removePlayer(slotIndex);
        },
      );
  });
}

/* =========================================
   MODIFICATION DU NOM
========================================= */

function startPlayerNameEdition(slotIndex) {
  const player =
    raidComposition[slotIndex];

  const slot = document.querySelector(
    `.slot[data-slot-index="${slotIndex}"]`,
  );

  if (!player || !slot) {
    return;
  }

  const playerName =
    slot.querySelector(".playerName");

  if (!playerName) {
    return;
  }

  const input =
    document.createElement("input");

  input.className = "playerInput";
  input.type = "text";
  input.value = player.name;
  input.maxLength = 24;

  playerName.replaceWith(input);

  input.focus();
  input.select();

  const saveName = () => {
    player.name =
      input.value.trim() || "Joueur";

    renderComposition();
  };

  input.addEventListener(
    "blur",
    saveName,
  );

  input.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        input.blur();
      }

      if (event.key === "Escape") {
        renderComposition();
      }
    },
  );
}

/* =========================================
   SUPPRESSION D’UN JOUEUR
========================================= */

function removePlayer(slotIndex) {
  raidComposition[slotIndex] = null;

  renderComposition();
}

/* =========================================
   COMPTEURS DE RÔLES
========================================= */

function updateRoleCounts() {
  const counts = {
    Tank: 0,
    Heal: 0,
    Mdps: 0,
    Rdps: 0,
  };

  getPlayers().forEach((player) => {
    if (Object.hasOwn(counts, player.role)) {
      counts[player.role] += 1;
    }
  });

  setElementText(
    "#tankCount",
    counts.Tank,
  );

  setElementText(
    "#healCount",
    counts.Heal,
  );

  setElementText(
    "#mdpsCount",
    counts.Mdps,
  );

  setElementText(
    "#rdpsCount",
    counts.Rdps,
  );

  setElementText(
    "#playerCount",
    `${getPlayers().length} / ${MAX_PLAYERS}`,
  );
}

/* =========================================
   COMPTEURS DE CLASSES
========================================= */

function updateClassCounts() {
  const classCountsContainer =
    document.querySelector("#classCounts");

  if (!classCountsContainer) {
    return;
  }

  const counts = new Map();

  getPlayers().forEach((player) => {
    if (!counts.has(player.classId)) {
      counts.set(player.classId, {
        name: player.className,
        color: player.classColor,
        count: 0,
      });
    }

    counts.get(player.classId).count += 1;
  });

  if (counts.size === 0) {
    classCountsContainer.innerHTML = `
      <div class="classCount">
        <span class="classCountName">
          Aucune classe
        </span>

        <strong class="classCountValue">
          0
        </strong>
      </div>
    `;

    return;
  }

  classCountsContainer.innerHTML =
    Array.from(counts.values())
      .sort(
        (
          firstClass,
          secondClass,
        ) =>
          firstClass.name.localeCompare(
            secondClass.name,
            "fr",
          ),
      )
      .map(
        (classData) => `
          <div class="classCount">
            <span
              class="classCountName"
              style="color: ${escapeAttribute(
                classData.color,
              )}"
            >
              ${escapeHtml(
                classData.name,
              )}
            </span>

            <strong class="classCountValue">
              ${classData.count}
            </strong>
          </div>
        `,
      )
      .join("");
}

/* =========================================
   MISE À JOUR DES SORTS
========================================= */

function updateSpellLists() {
  renderSpellCategory(
    "#buffSpellList",
    "buffs",
  );

  renderSpellCategory(
    "#defensiveSpellList",
    "defensifs",
  );

  renderSpellCategory(
    "#utilitySpellList",
    "utilitaires",
  );
}

/* =========================================
   AFFICHAGE D’UNE CATÉGORIE DE SORTS
========================================= */

function renderSpellCategory(
  selector,
  category,
) {
  const container =
    document.querySelector(selector);

  if (!container || !data) {
    return;
  }

  const spells =
    collectSpells(category);

  if (spells.length === 0) {
    container.innerHTML = `
      <div class="spellMissing">
        Aucun sort configuré
      </div>
    `;

    return;
  }

  container.innerHTML = spells
    .map(
      (spell) => `
        <div
          class="spellItem ${
            spell.present
              ? "spellPresent"
              : "spellMissing"
          }"
        >
          ${escapeHtml(spell.name)}
        </div>
      `,
    )
    .join("");
}

/* =========================================
   RÉCUPÉRATION DES SORTS
========================================= */

function collectSpells(category) {
  const spells = new Map();

  data.classes.forEach((classData) => {
    classData.spells[category].forEach(
      (spellName) => {
        if (!spells.has(spellName)) {
          spells.set(spellName, {
            name: spellName,

            present: hasClassInRaid(
              classData.id,
            ),
          });
        }
      },
    );

    classData.specs.forEach((spec) => {
      spec.spells[category].forEach(
        (spellName) => {
          if (!spells.has(spellName)) {
            spells.set(spellName, {
              name: spellName,

              present: hasSpecInRaid(
                classData.id,
                spec.id,
              ),
            });
          }
        },
      );
    });
  });

  return Array.from(
    spells.values(),
  );
}

/* =========================================
   PRÉSENCE D’UNE CLASSE
========================================= */

function hasClassInRaid(classId) {
  return getPlayers().some(
    (player) =>
      Number(player.classId) === Number(classId),
  );
}

/* =========================================
   PRÉSENCE D’UNE SPÉCIALISATION
========================================= */

function hasSpecInRaid(
  classId,
  specId,
) {
  return getPlayers().some(
    (player) =>
      Number(player.classId) === Number(classId) &&
      Number(player.specId) === Number(specId),
  );
}

/* =========================================
   ÉVÉNEMENTS DES BOUTONS
========================================= */

function attachActionEvents() {
  document
    .querySelector(
      "#saveRaidCompButton",
    )
    ?.addEventListener(
      "click",
      saveComposition,
    );

  document
    .querySelector(
      "#copyRaidCompButton",
    )
    ?.addEventListener(
      "click",
      copyCompositionLink,
    );

  document
    .querySelector(
      "#resetRaidCompButton",
    )
    ?.addEventListener(
      "click",
      resetComposition,
    );
}

/* =========================================
   SAUVEGARDE LOCALE
========================================= */

function saveComposition() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        raidComposition,
      ),
    );

    showMessage(
      "La composition a été sauvegardée.",
      "success",
    );
  } catch (error) {
    console.error(error);

    showMessage(
      "Impossible de sauvegarder la composition.",
      "error",
    );
  }
}

/* =========================================
   CHARGEMENT DEPUIS L’URL OU LOCALSTORAGE
========================================= */

function loadCompositionFromUrlOrStorage() {
  const urlComposition =
    loadCompositionFromUrl();

  if (urlComposition) {
    raidComposition = urlComposition;

    showMessage(
      "La composition partagée a été chargée.",
      "success",
    );

    return;
  }

  const savedComposition =
    localStorage.getItem(
      STORAGE_KEY,
    );

  if (!savedComposition) {
    return;
  }

  try {
    raidComposition =
      normalizeLoadedComposition(
        JSON.parse(
          savedComposition,
        ),
      );
  } catch (error) {
    console.error(error);

    localStorage.removeItem(
      STORAGE_KEY,
    );
  }
}

/* =========================================
   CRÉATION DU FORMAT COURT DE PARTAGE
========================================= */

function createShareCompositionString() {
  const entries = [];

  raidComposition.forEach(
    (player, slotIndex) => {
      if (!player) {
        return;
      }

      /*
       * Les positions commencent à 1 dans l’URL.
       * Le tableau JavaScript commence à 0.
       */
      const position = slotIndex + 1;

      const specId = Number(player.specId);

      const encodedName =
        encodeURIComponent(
          player.name || "Joueur",
        );

      entries.push(
        `${position}.${specId}.${encodedName}`,
      );
    },
  );

  if (entries.length === 0) {
    return "";
  }

  return `|${entries.join("|")}|`;
}

/* =========================================
   COPIE DU LIEN DE PARTAGE COURT
========================================= */

async function copyCompositionLink() {
  try {
    const shareComposition =
      createShareCompositionString();

    if (!shareComposition) {
      showMessage(
        "La composition est vide.",
        "error",
      );

      return;
    }

    /*
     * On construit manuellement l’URL afin de
     * conserver le format lisible avec les |.
     */
    const baseUrl =
      `${window.location.origin}${window.location.pathname}`;

    const shareUrl =
      `${baseUrl}?${SHARE_PARAMETER}=${shareComposition}`;

    await copyTextToClipboard(
      shareUrl,
    );

    showMessage(
      "Le lien de la composition a été copié.",
      "success",
    );
  } catch (error) {
    console.error(error);

    showMessage(
      "Impossible de copier le lien.",
      "error",
    );
  }
}

/* =========================================
   COPIE DANS LE PRESSE-PAPIERS
========================================= */

async function copyTextToClipboard(text) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  /*
   * Solution de secours pour Live Server,
   * HTTP local ou certains navigateurs.
   */
  const textarea =
    document.createElement("textarea");

  textarea.value = text;

  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();

  const copied =
    document.execCommand("copy");

  textarea.remove();

  if (!copied) {
    throw new Error(
      "La copie dans le presse-papiers a échoué.",
    );
  }
}

/* =========================================
   CHARGEMENT DU FORMAT COURT DEPUIS L’URL
========================================= */

function loadCompositionFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search,
    );

  const compositionString =
    params.get(SHARE_PARAMETER);

  if (!compositionString) {
    return null;
  }

  const loadedComposition =
    createEmptyComposition();

  const entries = compositionString
    .split("|")
    .filter((entry) => entry.trim() !== "");

  if (entries.length === 0) {
    return null;
  }

  let loadedPlayerCount = 0;

  entries.forEach((entry) => {
    /*
     * Le nom peut lui-même contenir des points.
     * L’expression régulière récupère donc :
     *
     * 1. la position ;
     * 2. le specId ;
     * 3. tout le reste comme nom.
     */
    const match = entry.match(
      /^(\d+)\.(\d+)\.(.*)$/,
    );

    if (!match) {
      console.warn(
        `Entrée de composition ignorée : ${entry}`,
      );

      return;
    }

    const position = Number(match[1]);
    const specId = Number(match[2]);

    let playerName = "Joueur";

    try {
      playerName =
        decodeURIComponent(match[3]) ||
        "Joueur";
    } catch (error) {
      console.warn(
        `Nom invalide dans l’entrée : ${entry}`,
        error,
      );

      playerName =
        match[3] || "Joueur";
    }

    if (
      position < 1 ||
      position > MAX_PLAYERS
    ) {
      console.warn(
        `Position invalide ignorée : ${position}`,
      );

      return;
    }

    const player = createPlayerFromSpecId(
      specId,
      playerName,
    );

    if (!player) {
      console.warn(
        `Spécialisation introuvable : ${specId}`,
      );

      return;
    }

    /*
     * L’URL utilise des positions de 1 à 40.
     * Le tableau utilise des index de 0 à 39.
     */
    loadedComposition[position - 1] =
      player;

    loadedPlayerCount += 1;
  });

  if (loadedPlayerCount === 0) {
    showMessage(
      "Le lien de composition ne contient aucun joueur valide.",
      "error",
    );

    return null;
  }

  return loadedComposition;
}

/* =========================================
   RÉINITIALISATION
========================================= */

function resetComposition() {
  const shouldReset =
    window.confirm(
      "Voulez-vous réinitialiser entièrement la composition ?",
    );

  if (!shouldReset) {
    return;
  }

  raidComposition =
    createEmptyComposition();

  localStorage.removeItem(
    STORAGE_KEY,
  );

  const url = new URL(
    window.location.href,
  );

  url.searchParams.delete(
    SHARE_PARAMETER,
  );

  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );

  renderComposition();

  showMessage(
    "La composition a été réinitialisée.",
    "success",
  );
}

/* =========================================
   NORMALISATION DU LOCALSTORAGE
========================================= */

function normalizeLoadedComposition(
  composition,
) {
  const normalizedComposition =
    createEmptyComposition();

  if (!Array.isArray(composition)) {
    return normalizedComposition;
  }

  composition
    .slice(0, MAX_PLAYERS)
    .forEach(
      (savedPlayer, index) => {
        if (!savedPlayer) {
          return;
        }

        /*
         * On reconstruit également les joueurs
         * sauvegardés à partir de classes.json.
         * Ainsi, les changements de couleur,
         * d’icône ou de rôle sont pris en compte.
         */
        const player =
          createPlayerFromSpecId(
            savedPlayer.specId,
            savedPlayer.name,
          );

        normalizedComposition[index] =
          player;
      },
    );

  return normalizedComposition;
}

/* =========================================
   RÉCUPÉRATION DES JOUEURS
========================================= */

function getPlayers() {
  return raidComposition.filter(
    (player) => player !== null,
  );
}

/* =========================================
   MODIFICATION D’UN TEXTE DANS LE DOM
========================================= */

function setElementText(
  selector,
  value,
) {
  const element =
    document.querySelector(
      selector,
    );

  if (element) {
    element.textContent =
      String(value);
  }
}

/* =========================================
   IDENTIFIANT UNIQUE
========================================= */

function createUniqueId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

/* =========================================
   AFFICHAGE DES MESSAGES
========================================= */

function showMessage(
  message,
  type = "",
) {
  const messageElement =
    document.querySelector(
      "#raidCompMessage",
    );

  if (!messageElement) {
    return;
  }

  window.clearTimeout(
    messageTimeout,
  );

  messageElement.className =
    "raidCompMessage";

  if (type) {
    messageElement.classList.add(
      type,
    );
  }

  messageElement.textContent =
    message;

  messageTimeout =
    window.setTimeout(() => {
      messageElement.textContent =
        "";

      messageElement.className =
        "raidCompMessage";
    }, 4000);
}

/* =========================================
   SÉCURISATION DU HTML
========================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;",
    );
}

/* =========================================
   SÉCURISATION DES ATTRIBUTS HTML
========================================= */

function escapeAttribute(value) {
  return escapeHtml(value);
}