/* =========================================
   CONFIGURATION
========================================= */

const SITE_DATA_PATH = "../data/site.json";
const RAID_DATA_FOLDER = "../data/raid";

const ROLE_LABELS = {
  tank: "Tank",
  heal: "Heal",
  dps: "DPS",
  all: "Tous",
  assigned: "Assignés",
};

const TYPE_LABELS = {
  adds: "Adds",
  control: "Contrôle",
  "priority-target": "Cible prioritaire",
  "raid-damage": "Dégâts de raid",
  "boss-energy": "Énergie",
  aoe: "AoE",
  dodge: "Esquive",
  movement: "Déplacement",
  dispel: "Dispell",
  positioning: "Placement",
  "ground-effect": "Zone au sol",
  tank: "Tank",
  "tank-swap": "Tank swap",
  "healing-reduction": "Réduction de soins",
  beam: "Rayon",
  soak: "Soak",
  interrupt: "Interruption",
};

/* =========================================
   ÉTAT
========================================= */

let currentRaidId = null;
let currentRaid = null;
let currentBoss = null;

/* =========================================
   INITIALISATION
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializeSidebarToggle();

    try {
      currentRaidId =
        await resolveRaidId();

      currentRaid =
        await loadRaid(
          currentRaidId,
        );

      currentBoss =
        resolveBoss(
          currentRaid,
        );

      renderSidebar(
        currentRaid,
        currentBoss,
      );

      renderBossGuide(
        currentBoss,
      );

      initializeRaidplanCarousels();
      initializeRaidplanLightbox();

      document.title =
        `${currentBoss.name} — Illivium Tactics`;
    } catch (error) {
      console.error(error);

      renderLoadingError(
        error.message,
      );
    }
  },
);

/* =========================================
   PARAMÈTRES D’URL
========================================= */

function getUrlParameters() {
  const parameters =
    new URLSearchParams(
      window.location.search,
    );

  return {
    raidId:
      parameters.get("raid"),

    bossId:
      parameters.get("boss"),
  };
}

/* =========================================
   RAID À CHARGER
========================================= */

async function resolveRaidId() {
  const { raidId } =
    getUrlParameters();

  if (raidId) {
    return raidId;
  }

  const response =
    await fetch(
      SITE_DATA_PATH,
    );

  if (!response.ok) {
    throw new Error(
      "Impossible de charger site.json.",
    );
  }

  const siteData =
    await response.json();

  if (!siteData.currentRaid) {
    throw new Error(
      "Aucun raid actuel n’est défini dans site.json.",
    );
  }

  return siteData.currentRaid;
}

/* =========================================
   CHARGEMENT DU RAID
========================================= */

async function loadRaid(raidId) {
  const response =
    await fetch(
      `${RAID_DATA_FOLDER}/${raidId}.json`,
    );

  if (!response.ok) {
    throw new Error(
      `Impossible de charger le raid ${raidId}.`,
    );
  }

  const raid =
    await response.json();

  if (
    !raid.name ||
    !Array.isArray(raid.bosses)
  ) {
    throw new Error(
      "Le fichier du raid possède une structure invalide.",
    );
  }

  return raid;
}

/* =========================================
   BOSS À AFFICHER
========================================= */

function resolveBoss(raid) {
  const { bossId } =
    getUrlParameters();

  if (!bossId) {
    if (!raid.bosses[0]) {
      throw new Error(
        "Ce raid ne contient aucun boss.",
      );
    }

    return raid.bosses[0];
  }

  const boss =
    raid.bosses.find(
      (currentBossData) =>
        currentBossData.id ===
        bossId,
    );

  if (!boss) {
    throw new Error(
      `Le boss ${bossId} est introuvable.`,
    );
  }

  return boss;
}

/* =========================================
   CHEMINS D’IMAGES
========================================= */

function buildBossIconPath(
  raidId,
  filename,
) {
  return (
    `../assets/images/boss-guide/` +
    `${raidId}/icons/${filename}`
  );
}

function buildBossBannerPath(
  raidId,
  filename,
) {
  if (!filename) {
    return "";
  }

  return (
    `../assets/images/boss-guide/` +
    `${raidId}/banners/${filename}`
  );
}

function buildRaidplanPath(
  raidId,
  filename,
) {
  return (
    `../assets/images/boss-guide/` +
    `${raidId}/raidplans/${filename}`
  );
}

/* =========================================
   SIDEBAR
========================================= */

function renderSidebar(
  raid,
  activeBoss,
) {
  const sidebar =
    document.querySelector(
      "#bossSidebar",
    );

  if (!sidebar) {
    return;
  }

  const bossLinks =
    raid.bosses
      .map((boss) => {
        const isActive =
          boss.id ===
          activeBoss.id;

        const iconPath =
          buildBossIconPath(
            currentRaidId,
            boss.image,
          );

        const href =
          `boss-guide.html?raid=${encodeURIComponent(
            currentRaidId,
          )}&boss=${encodeURIComponent(
            boss.id,
          )}`;

        return `
          <li class="bossSidebarItem">
            <a
              class="bossSidebarLink ${
                isActive
                  ? "active"
                  : ""
              }"
              href="${href}"
              ${
                isActive
                  ? 'aria-current="page"'
                  : ""
              }
            >
              <img
                class="bossSidebarIcon"
                src="${escapeAttribute(
                  iconPath,
                )}"
                alt=""
              />

              <span class="bossSidebarName">
                ${escapeHtml(
                  boss.name,
                )}
              </span>
            </a>
          </li>
        `;
      })
      .join("");

  sidebar.innerHTML = `
    <div class="bossSidebarHeader">
      <h2>
        ${escapeHtml(
          raid.name,
        )}
      </h2>

      <p>
        ${raid.bosses.length} boss
      </p>
    </div>

    <nav aria-label="Boss du raid">
      <ul class="bossSidebarList">
        ${bossLinks}
      </ul>
    </nav>
  `;
}

/* =========================================
   SIDEBAR MOBILE
========================================= */

function initializeSidebarToggle() {
  const toggleButton =
    document.querySelector(
      "#sidebarToggleButton",
    );

  const sidebar =
    document.querySelector(
      "#bossSidebar",
    );

  if (
    !toggleButton ||
    !sidebar
  ) {
    return;
  }

  toggleButton.addEventListener(
    "click",
    () => {
      const isOpen =
        sidebar.classList.toggle(
          "open",
        );

      toggleButton.setAttribute(
        "aria-expanded",
        String(isOpen),
      );

      toggleButton.textContent =
        isOpen
          ? "Masquer les boss"
          : "Boss du raid";
    },
  );
}

/* =========================================
   GUIDE COMPLET
========================================= */

function renderBossGuide(boss) {
  const content =
    document.querySelector(
      "#bossGuideContent",
    );

  if (!content) {
    return;
  }

  content.innerHTML = [
    renderBossHeader(boss),
    renderCriticalWarning(boss),
    renderBossSummary(boss),
    renderPhases(boss),
    renderRoleSummaries(boss),
    renderTips(boss),
    renderVideo(boss),
  ]
    .filter(Boolean)
    .join("");
}

/* =========================================
   EN-TÊTE DU BOSS
========================================= */

function renderBossHeader(boss) {
  const iconPath =
    buildBossIconPath(
      currentRaidId,
      boss.image,
    );

  const bannerPath =
    buildBossBannerPath(
      currentRaidId,
      boss.banner,
    );

  const combatType =
    boss.meta?.combat ||
    boss.header?.combatType ||
    "";

  const heroism =
    boss.meta?.heroism ||
    boss.header?.heroism ||
    "";

  const bannerStyle = bannerPath
    ? `style="--boss-banner-image: url('${escapeAttribute(
        bannerPath,
      )}');"`
    : "";

  return `
    <header
      class="bossHeader ${
        bannerPath ? "hasBanner" : ""
      }"
      ${bannerStyle}
    >
      <img
        class="bossHeaderIcon"
        src="${escapeAttribute(iconPath)}"
        alt="${escapeAttribute(boss.name)}"
      />

      <div class="bossHeaderText">
        <h1>
          ${escapeHtml(boss.name)}
        </h1>

        <div class="bossMeta">
          ${
            combatType
              ? `
                <span class="bossMetaItem">
                  ${escapeHtml(combatType)}
                </span>
              `
              : ""
          }

          ${
            heroism
              ? `
                <span class="bossMetaItem heroism">
                  BL ${escapeHtml(heroism)}
                </span>
              `
              : ""
          }
        </div>
      </div>
    </header>
  `;
}

/* =========================================
   AVERTISSEMENT
========================================= */

function renderCriticalWarning(boss) {
  const warning =
    boss.warning ||
    boss.criticalWarning;

  if (!warning) {
    return "";
  }

  if (
    typeof warning ===
    "string"
  ) {
    return `
      <section class="criticalWarning">
        <h2>
          ☠
        </h2>

        <p>
          ${escapeHtml(
            warning,
          )}
        </p>
      </section>
    `;
  }

  return `
    <section class="criticalWarning">
      <h2>
        ${escapeHtml(
          warning.title ||
          "Avertissement critique",
        )}
      </h2>

      <p>
        ${escapeHtml(
          warning.description ||
          "",
        )}
      </p>
    </section>
  `;
}

/* =========================================
   RÉSUMÉ
========================================= */

function renderBossSummary(boss) {
  if (!boss.summary) {
    return "";
  }

  const summaryText =
    Array.isArray(
      boss.summary,
    )
      ? boss.summary.join(" ")
      : boss.summary;

  return `
    <section class="bossSummary">
      <h2>
        Résumé du combat
      </h2>

      <p>
        ${escapeHtml(
          summaryText,
        )}
      </p>
    </section>
  `;
}

/* =========================================
   PHASES
========================================= */

function renderPhases(boss) {
  if (
    !Array.isArray(
      boss.phases,
    ) ||
    boss.phases.length === 0
  ) {
    return "";
  }

  return boss.phases
    .map(
      (
        phase,
        phaseIndex,
      ) => {
        const phaseClass =
          phase.type ===
          "intermission"
            ? "intermission"
            : "";

        const mechanics =
          getPhaseMechanics(
            phase,
          );

        const columns =
          getPhaseColumns(
            phase,
          );

        return `
          <section
            class="bossPhase ${phaseClass}"
            data-phase-index="${phaseIndex}"
          >
            <header class="phaseHeader">
              <div class="phaseName">
                ${escapeHtml(
                  phase.name ||
                  `Phase ${phaseIndex + 1}`,
                )}
              </div>

              ${
                phase.title
                  ? `
                    <h2>
                      ${escapeHtml(
                        phase.title,
                      )}
                    </h2>
                  `
                  : ""
              }

              ${
                phase.description
                  ? `
                    <p class="phaseDescription">
                      ${escapeHtml(
                        phase.description,
                      )}
                    </p>
                  `
                  : ""
              }
            </header>

            ${
              mechanics.length > 0
                ? `
                  <div class="phaseMechanics">
                    ${mechanics
                      .map(
                        (
                          mechanic,
                          mechanicIndex,
                        ) =>
                          renderMechanic(
                            mechanic,
                            `${phaseIndex}-${mechanicIndex}`,
                          ),
                      )
                      .join("")}
                  </div>
                `
                : ""
            }

            ${
              columns.length > 0
                ? renderPhaseColumns(
                    columns,
                    phaseIndex,
                  )
                : ""
            }

            ${
              phase.note
                ? `
                  <div class="phaseNote">
                    ${escapeHtml(
                      phase.note,
                    )}
                  </div>
                `
                : ""
            }
          </section>
        `;
      },
    )
    .join("");
}

/* =========================================
   MÉCANIQUES D’UNE PHASE
========================================= */

function getPhaseMechanics(phase) {
  if (
    Array.isArray(
      phase.mechanics,
    )
  ) {
    return phase.mechanics;
  }

  if (
    Array.isArray(
      phase.blocks,
    )
  ) {
    return phase.blocks.filter(
      (block) =>
        block.type ===
          "mechanic" ||
        block.type ===
          "rule" ||
        block.type ===
          "tip" ||
        block.type ===
          "warning",
    );
  }

  return [];
}

/* =========================================
   COLONNES D’UNE PHASE
========================================= */

function getPhaseColumns(phase) {
  if (
    !Array.isArray(
      phase.columns,
    )
  ) {
    return [];
  }

  return phase.columns.filter(
    (column) =>
      column &&
      Array.isArray(
        column.mechanics,
      ),
  );
}

function renderPhaseColumns(
  columns,
  phaseIndex,
) {
  if (
    !Array.isArray(columns) ||
    columns.length === 0
  ) {
    return "";
  }

  const columnsLayoutClass =
    columns.length % 2 === 0
      ? "phaseColumnsEven"
      : "phaseColumnsOdd";

  return `
    <div
      class="phaseColumns ${columnsLayoutClass}"
    >
      ${columns
        .map(
          (
            column,
            columnIndex,
          ) =>
            renderPhaseColumn(
              column,
              phaseIndex,
              columnIndex,
            ),
        )
        .join("")}
    </div>
  `;
}

function renderPhaseColumn(
  column,
  phaseIndex,
  columnIndex,
) {
  const mechanics =
    Array.isArray(
      column.mechanics,
    )
      ? column.mechanics
      : [];

  return `
    <section
      class="phaseColumn"
      data-column-index="${columnIndex}"
    >
      <header class="phaseColumnHeader">
        ${
          column.title
            ? `
              <h3 class="phaseColumnTitle">
                ${escapeHtml(
                  column.title,
                )}
              </h3>
            `
            : ""
        }

        ${
          column.subtitle
            ? `
              <p class="phaseColumnSubtitle">
                ${escapeHtml(
                  column.subtitle,
                )}
              </p>
            `
            : ""
        }
      </header>

      <div class="phaseColumnMechanics">
        ${mechanics
          .map(
            (
              mechanic,
              mechanicIndex,
            ) =>
              renderMechanic(
                mechanic,
                `${phaseIndex}-column-${columnIndex}-${mechanicIndex}`,
              ),
          )
          .join("")}
      </div>
    </section>
  `;
}

/* =========================================
   MÉCANIQUE
========================================= */

function renderMechanic(
  mechanic,
  mechanicKey,
) {
  const title =
    mechanic.name ||
    mechanic.label ||
    mechanic.title ||
    "Mécanique";

  const rawText =
    mechanic.text ||
    mechanic.description ||
    mechanic.strategy ||
    "";

  const text =
    Array.isArray(
      rawText,
    )
      ? rawText.join(" ")
      : rawText;

  const badges = [
    ...renderRoleBadges(
      mechanic.roles,
    ),

    ...renderTypeBadges(
      mechanic.types,
    ),
  ].join("");

  const plan =
    mechanic.plan ||
    mechanic.raidplan ||
    null;

  const importantClass =
    mechanic.important
      ? "important"
      : "";

  return `
    <article class="mechanicCard ${importantClass}">
      <header class="mechanicHeader">
        <h3>
          ${escapeHtml(
            title,
          )}
        </h3>

        ${
          badges
            ? `
              <div class="mechanicBadges">
                ${badges}
              </div>
            `
            : ""
        }
      </header>

      ${
        text
          ? `
            <div class="mechanicText">
              ${escapeHtml(
                text,
              )}
            </div>
          `
          : ""
      }

      ${
        plan
          ? renderRaidplan(
              plan,
              mechanicKey,
            )
          : ""
      }
    </article>
  `;
}

/* =========================================
   BADGES DE RÔLES
========================================= */

function renderRoleBadges(roles) {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.map((role) => {
    const label =
      ROLE_LABELS[role] ||
      role;

    let className =
      "role-all";

    if (role === "tank") {
      className =
        "role-tank";
    }

    if (role === "heal") {
      className =
        "role-heal";
    }

    if (role === "dps") {
      className =
        "role-dps";
    }

    return `
      <span class="mechanicBadge ${className}">
        ${escapeHtml(
          label,
        )}
      </span>
    `;
  });
}

/* =========================================
   BADGES DE TYPES
========================================= */

function renderTypeBadges(types) {
  if (!Array.isArray(types)) {
    return [];
  }

  return types.map((type) => {
    const label =
      TYPE_LABELS[type] ||
      type;

    return `
      <span class="mechanicBadge">
        ${escapeHtml(
          label,
        )}
      </span>
    `;
  });
}

/* =========================================
   RAIDPLAN
========================================= */

function renderRaidplan(
  plan,
  mechanicKey,
) {
  const slides =
    normalizeRaidplanSlides(
      plan,
    );

  if (slides.length === 0) {
    return "";
  }

  const safeMechanicKey =
    String(
      mechanicKey ||
      "mechanic",
    ).replace(
      /[^a-zA-Z0-9-_]/g,
      "",
    );

  const carouselId =
    `raidplan-${safeMechanicKey}`;

  const firstSlide =
    slides[0];

  const firstImagePath =
    buildRaidplanPath(
      currentRaidId,
      firstSlide.image,
    );

  const singleSlideClass =
    slides.length === 1
      ? "singleSlide"
      : "";

  const dots =
    slides
      .map(
        (
          slide,
          slideIndex,
        ) => `
          <button
            class="raidplanDot ${
              slideIndex === 0
                ? "active"
                : ""
            }"
            type="button"
            data-slide-index="${slideIndex}"
            aria-label="Afficher le plan ${
              slideIndex + 1
            }"
            ${
              slideIndex === 0
                ? 'aria-current="true"'
                : ""
            }
          ></button>
        `,
      )
      .join("");

  return `
    <section
      id="${carouselId}"
      class="raidplanBlock ${singleSlideClass}"
      data-current-slide="0"
      data-slides="${escapeAttribute(
        JSON.stringify(
          slides,
        ),
      )}"
    >
      <header class="raidplanHeader">
        <h4>
          ${escapeHtml(
            plan.title ||
            "Raidplan",
          )}
        </h4>

        ${
          plan.description
            ? `
              <p>
                ${escapeHtml(
                  plan.description,
                )}
              </p>
            `
            : ""
        }
      </header>

      <div class="raidplanViewport">
        <button
          class="raidplanArrow raidplanArrowPrevious"
          type="button"
          aria-label="Plan précédent"
          disabled
        >
          ❮
        </button>

        <figure class="raidplanSlide">
          <img
            class="raidplanImage"
            src="${escapeAttribute(
              firstImagePath,
            )}"
            alt="${escapeAttribute(
              firstSlide.alt ||
              "",
            )}"
          />

          <figcaption class="raidplanCaption">
            ${escapeHtml(
              firstSlide.caption ||
              "",
            )}
          </figcaption>
        </figure>

        <button
          class="raidplanArrow raidplanArrowNext"
          type="button"
          aria-label="Plan suivant"
          ${
            slides.length === 1
              ? "disabled"
              : ""
          }
        >
          ❯
        </button>
      </div>

      <div class="raidplanDots">
        ${dots}
      </div>
    </section>
  `;
}

/* =========================================
   SLIDES RAIDPLAN
========================================= */

function normalizeRaidplanSlides(plan) {
  if (
    Array.isArray(
      plan.slides,
    )
  ) {
    return plan.slides
      .map((slide) => {
        if (
          typeof slide ===
          "string"
        ) {
          return {
            image: slide,
            alt: "",
            caption: "",
          };
        }

        return {
          image:
            slide.image ||
            "",

          alt:
            slide.alt ||
            "",

          caption:
            slide.caption ||
            "",
        };
      })
      .filter(
        (slide) =>
          slide.image,
      );
  }

  if (plan.image) {
    return [
      {
        image: plan.image,

        alt:
          plan.alt ||
          "",

        caption:
          plan.caption ||
          "",
      },
    ];
  }

  return [];
}

/* =========================================
   INITIALISATION CARROUSELS
========================================= */

function initializeRaidplanCarousels() {
  document
    .querySelectorAll(
      ".raidplanBlock",
    )
    .forEach((carousel) => {
      const previousButton =
        carousel.querySelector(
          ".raidplanArrowPrevious",
        );

      const nextButton =
        carousel.querySelector(
          ".raidplanArrowNext",
        );

      const dots =
        carousel.querySelectorAll(
          ".raidplanDot",
        );

      previousButton?.addEventListener(
        "click",
        () => {
          changeCarouselSlide(
            carousel,
            getCarouselIndex(
              carousel,
            ) - 1,
          );
        },
      );

      nextButton?.addEventListener(
        "click",
        () => {
          changeCarouselSlide(
            carousel,
            getCarouselIndex(
              carousel,
            ) + 1,
          );
        },
      );

      dots.forEach((dot) => {
        dot.addEventListener(
          "click",
          () => {
            changeCarouselSlide(
              carousel,
              Number(
                dot.dataset
                  .slideIndex,
              ),
            );
          },
        );
      });
    });
}

/* =========================================
   CHANGEMENT DE SLIDE
========================================= */

function changeCarouselSlide(
  carousel,
  requestedIndex,
) {
  const slides =
    JSON.parse(
      carousel.dataset.slides ||
      "[]",
    );

  if (
    requestedIndex < 0 ||
    requestedIndex >=
      slides.length
  ) {
    return;
  }

  const slide =
    slides[requestedIndex];

  const image =
    carousel.querySelector(
      ".raidplanImage",
    );

  const caption =
    carousel.querySelector(
      ".raidplanCaption",
    );

  const previousButton =
    carousel.querySelector(
      ".raidplanArrowPrevious",
    );

  const nextButton =
    carousel.querySelector(
      ".raidplanArrowNext",
    );

  const dots =
    carousel.querySelectorAll(
      ".raidplanDot",
    );

  carousel.dataset.currentSlide =
    String(requestedIndex);

  if (image) {
    image.src =
      buildRaidplanPath(
        currentRaidId,
        slide.image,
      );

    image.alt =
      slide.alt ||
      "";
  }

  if (caption) {
    caption.textContent =
      slide.caption ||
      "";
  }

  if (previousButton) {
    previousButton.disabled =
      requestedIndex === 0;
  }

  if (nextButton) {
    nextButton.disabled =
      requestedIndex ===
      slides.length - 1;
  }

  dots.forEach(
    (
      dot,
      dotIndex,
    ) => {
      const isActive =
        dotIndex ===
        requestedIndex;

      dot.classList.toggle(
        "active",
        isActive,
      );

      if (isActive) {
        dot.setAttribute(
          "aria-current",
          "true",
        );
      } else {
        dot.removeAttribute(
          "aria-current",
        );
      }
    },
  );
}

function getCarouselIndex(carousel) {
  return Number(
    carousel.dataset
      .currentSlide ||
    0,
  );
}

/* =========================================
   RÉSUMÉ PAR RÔLE
========================================= */

function renderRoleSummaries(boss) {
  const roles =
    boss.roles ||
    boss.roleSummaries;

  if (
    !roles ||
    typeof roles !==
      "object"
  ) {
    return "";
  }

  const orderedRoles = [
    "tank",
    "heal",
    "dps",
    "all",
  ];

  const cards =
    orderedRoles
      .filter(
        (role) =>
          roles[role],
      )
      .map((role) => {
        const content =
          Array.isArray(
            roles[role],
          )
            ? roles[role].join(
                " ",
              )
            : roles[role];

        return `
          <article
            class="roleSummaryCard role-${role}"
          >
            <h3>
              ${escapeHtml(
                ROLE_LABELS[
                  role
                ] ||
                role,
              )}
            </h3>

            <p>
              ${escapeHtml(
                content,
              )}
            </p>
          </article>
        `;
      })
      .join("");

  if (!cards) {
    return "";
  }

  return `
    <section class="roleSummarySection">
      <h2>
        Résumé par rôle
      </h2>

      <div class="roleSummaryGrid">
        ${cards}
      </div>
    </section>
  `;
}

/* =========================================
   CONSEILS
========================================= */

function renderTips(boss) {
  if (
    !boss.tips ||
    typeof boss.tips !==
      "object"
  ) {
    return "";
  }

  const doItems =
    Array.isArray(
      boss.tips.do,
    )
      ? boss.tips.do
      : [];

  const dontItems =
    Array.isArray(
      boss.tips.dont,
    )
      ? boss.tips.dont
      : [];

  if (
    doItems.length === 0 &&
    dontItems.length === 0
  ) {
    return "";
  }

  return `
    <section class="bossTipsSection">
      <h2>
        Conseils essentiels
      </h2>

      <div class="bossTipsGrid">
        ${
          doItems.length
            ? `
              <article class="bossTipsCard do">
                <h3>
                  À faire
                </h3>

                <ul>
                  ${doItems
                    .map(
                      (item) => `
                        <li>
                          ${escapeHtml(
                            item,
                          )}
                        </li>
                      `,
                    )
                    .join("")}
                </ul>
              </article>
            `
            : ""
        }

        ${
          dontItems.length
            ? `
              <article class="bossTipsCard dont">
                <h3>
                  À éviter
                </h3>

                <ul>
                  ${dontItems
                    .map(
                      (item) => `
                        <li>
                          ${escapeHtml(
                            item,
                          )}
                        </li>
                      `,
                    )
                    .join("")}
                </ul>
              </article>
            `
            : ""
        }
      </div>
    </section>
  `;
}

/* =========================================
   VIDÉO
========================================= */

function renderVideo(boss) {
  if (!boss.video) {
    return "";
  }

  const embedUrl =
    getVideoEmbedUrl(
      boss.video,
    );

  return `
    <section class="bossVideoSection">
      <h2>
        ${escapeHtml(
          boss.video.title ||
          "Guide vidéo",
        )}
      </h2>

      ${
        embedUrl
          ? `
            <div class="videoWrapper">
              <iframe
                src="${escapeAttribute(
                  embedUrl,
                )}"
                title="${escapeAttribute(
                  boss.video.title ||
                  `Guide vidéo de ${boss.name}`,
                )}"
                loading="lazy"
                allow="
                  accelerometer;
                  autoplay;
                  clipboard-write;
                  encrypted-media;
                  gyroscope;
                  picture-in-picture;
                  web-share
                "
                allowfullscreen
              ></iframe>
            </div>
          `
          : `
            <div class="videoUnavailable">
              La vidéo n’est pas encore disponible.
            </div>
          `
      }
    </section>
  `;
}

function getVideoEmbedUrl(video) {
  if (!video) {
    return "";
  }

  if (
    video.provider ===
      "youtube" &&
    video.id
  ) {
    return (
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(
        video.id,
      )
    );
  }

  if (video.embedUrl) {
    return video.embedUrl;
  }

  return "";
}

/* =========================================
   ERREUR
========================================= */

function renderLoadingError(message) {
  const sidebar =
    document.querySelector(
      "#bossSidebar",
    );

  const content =
    document.querySelector(
      "#bossGuideContent",
    );

  if (sidebar) {
    sidebar.innerHTML = `
      <p class="errorMessage">
        Impossible de charger la sidebar.
      </p>
    `;
  }

  if (content) {
    content.innerHTML = `
      <p class="errorMessage">
        ${escapeHtml(
          message ||
          "Impossible de charger le guide.",
        )}
      </p>
    `;
  }
}

/* =========================================
   SÉCURISATION
========================================= */

function escapeHtml(value) {
  return String(
    value ?? "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

/* =========================================
   RAIDPLAN PLEIN ÉCRAN
========================================= */

function initializeRaidplanLightbox() {
  document
    .querySelectorAll(".raidplanBlock")
    .forEach((carousel) => {
      const image =
        carousel.querySelector(".raidplanImage");

      if (!image) {
        return;
      }

      image.addEventListener("click", () => {
        openRaidplanLightbox(carousel);
      });
    });
}

function openRaidplanLightbox(carousel) {
  const slides =
    JSON.parse(
      carousel.dataset.slides || "[]"
    );

  if (slides.length === 0) {
    return;
  }

  let currentIndex =
    getCarouselIndex(carousel);

  const lightbox =
    document.createElement("div");

  lightbox.className = "raidplanLightbox";

  lightbox.innerHTML = `
    <div class="raidplanLightboxContent">

      <button
        class="raidplanLightboxClose"
        type="button"
        aria-label="Fermer"
      >
        ×
      </button>

      <button
        class="raidplanLightboxArrow raidplanLightboxPrevious"
        type="button"
        aria-label="Plan précédent"
      >
        ❮
      </button>

      <figure class="raidplanLightboxFigure">

        <img
          class="raidplanLightboxImage"
          src=""
          alt=""
        >

        <figcaption class="raidplanLightboxCaption">
        </figcaption>

      </figure>

      <button
        class="raidplanLightboxArrow raidplanLightboxNext"
        type="button"
        aria-label="Plan suivant"
      >
        ❯
      </button>

      <div class="raidplanLightboxDots">
        ${slides
          .map(
            (_, index) => `
              <button
                class="raidplanLightboxDot"
                type="button"
                data-slide-index="${index}"
                aria-label="Afficher le plan ${index + 1}"
              ></button>
            `
          )
          .join("")}
      </div>

    </div>
  `;

  document.body.appendChild(lightbox);

  document.body.classList.add(
    "raidplanLightboxOpen"
  );

  const image =
    lightbox.querySelector(
      ".raidplanLightboxImage"
    );

  const caption =
    lightbox.querySelector(
      ".raidplanLightboxCaption"
    );

  const previousButton =
    lightbox.querySelector(
      ".raidplanLightboxPrevious"
    );

  const nextButton =
    lightbox.querySelector(
      ".raidplanLightboxNext"
    );

  const closeButton =
    lightbox.querySelector(
      ".raidplanLightboxClose"
    );

  const dots =
    lightbox.querySelectorAll(
      ".raidplanLightboxDot"
    );

  function updateLightbox(index) {
    if (
      index < 0 ||
      index >= slides.length
    ) {
      return;
    }

    currentIndex = index;

    const slide =
      slides[currentIndex];

    image.src =
      buildRaidplanPath(
        currentRaidId,
        slide.image
      );

    image.alt =
      slide.alt || "";

    caption.textContent =
      slide.caption || "";

    previousButton.disabled =
      currentIndex === 0;

    nextButton.disabled =
      currentIndex ===
      slides.length - 1;

    dots.forEach(
      (dot, dotIndex) => {
        const isActive =
          dotIndex === currentIndex;

        dot.classList.toggle(
          "active",
          isActive
        );
      }
    );

    /*
     * Synchronise également le petit
     * carrousel de la page.
     */
    changeCarouselSlide(
      carousel,
      currentIndex
    );
  }

  function closeLightbox() {
    lightbox.remove();

    document.body.classList.remove(
      "raidplanLightboxOpen"
    );

    document.removeEventListener(
      "keydown",
      handleKeyboard
    );
  }

  function handleKeyboard(event) {
    if (event.key === "Escape") {
      closeLightbox();
    }

    if (
      event.key === "ArrowLeft"
    ) {
      updateLightbox(
        currentIndex - 1
      );
    }

    if (
      event.key === "ArrowRight"
    ) {
      updateLightbox(
        currentIndex + 1
      );
    }
  }

  previousButton.addEventListener(
    "click",
    () => {
      updateLightbox(
        currentIndex - 1
      );
    }
  );

  nextButton.addEventListener(
    "click",
    () => {
      updateLightbox(
        currentIndex + 1
      );
    }
  );

  closeButton.addEventListener(
    "click",
    closeLightbox
  );

  dots.forEach((dot) => {
    dot.addEventListener(
      "click",
      () => {
        updateLightbox(
          Number(
            dot.dataset.slideIndex
          )
        );
      }
    );
  });

  /*
   * Clic sur le fond noir = fermeture.
   */
  lightbox.addEventListener(
    "click",
    (event) => {
      if (
        event.target === lightbox
      ) {
        closeLightbox();
      }
    }
  );

  document.addEventListener(
    "keydown",
    handleKeyboard
  );

  updateLightbox(currentIndex);
}