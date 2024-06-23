const waitForElement = async (selector) => {
  let element;
  let counter = 0;
  while (!element && counter <= 120) {
    element = document.querySelector(selector);
    if (element) break;
    await new Promise((r) => setTimeout(() => { r() }, 1000));
    counter++;
  }
  await new Promise((r) => setTimeout(() => { r() }, 2000));
  return element;
}

export default waitForElement;
