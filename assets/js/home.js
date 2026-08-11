async function loadCurrentRaid() {
  try {
    // Chargement de la configuration générale du site
    const siteResponse = await fetch("data/site.json");

    if (!siteResponse.ok) {
      throw new Error(
        `Impossible de charger site.json : ${siteResponse.status}`,
      );
    }

    const site = await siteResponse.json();

    if (!site.currentRaid) {
      throw new Error("La propriété currentRaid est absente de site.json.");
    }

    // Chargement du fichier JSON correspondant au raid actuel
    const raidResponse = await fetch(`data/raid/${site.currentRaid}.json`);

    if (!raidResponse.ok) {
      throw new Error(
        `Impossible de charger ${site.currentRaid}.json : ${raidResponse.status}`,
      );
    }

    const raid = await raidResponse.json();

    if (!Array.isArray(raid.bosses)) {
      throw new Error(
        `La propriété bosses de ${site.currentRaid}.json doit être un tableau.`,
      );
    }

    // Récupération de la section présente dans index.html
    const currentRaidSection = document.querySelector(".currentRaidSection");

    if (!currentRaidSection) {
      throw new Error(
        "La section .currentRaidSection est introuvable dans index.html.",
      );
    }

    // Génération automatique du raid et de ses boss
    currentRaidSection.innerHTML = `
    <div class="titleDiv">
      <h2>${raid.name}</h2>
    </div>
      <div class="currentRaidBossContainer">
        ${raid.bosses
          .map(
            (boss) => `
              <article class="raidBossContainer">
                <a href="pages/boss-guide.html?raid=${site.currentRaid}&boss=${boss.id}">
                  <div class="bossLogoContainer">
                    <img
                      src="assets/images/boss-guide/the-venomous-abyss/icons/${boss.image}"
                      alt="${boss.name}"
                    />
                  </div>

                  <h3>${boss.name}</h3>
                </a>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  } catch (error) {
    console.error("Erreur lors du chargement du raid :", error);
  }
}

loadCurrentRaid();
