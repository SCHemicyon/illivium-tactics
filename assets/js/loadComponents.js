async function loadComponent(selector, path, root = "./") {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Impossible de charger ${path}`);
    }

    let html = await response.text();

    html = html.replaceAll("{{ROOT}}", root);

    element.innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}
