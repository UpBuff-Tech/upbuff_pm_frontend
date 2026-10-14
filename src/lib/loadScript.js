// Runs a classic <script src="..."> file. The old layout templates contained script tags
// (theme menu, charts...) that ran every time the layout was rendered; layouts call this instead.

/** Loads the scripts one after another. Each file is executed again on every call, like before. */
export async function loadScripts(sources) {
  for (const src of sources) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = resolve; // a missing optional script must not block the page
      document.body.appendChild(script);
    });
  }
}
