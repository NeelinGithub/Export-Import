export const customPrompt = (message: string, callback: (result: string | null) => void) => {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const modal = document.createElement('div');
  modal.style.backgroundColor = '#fff';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  modal.style.width = '300px';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.gap = '15px';

  const text = document.createElement('div');
  text.innerText = message;
  text.style.fontSize = '14px';
  text.style.fontWeight = 'bold';
  text.style.color = '#333';

  const input = document.createElement('input');
  input.type = 'text';
  input.style.width = '100%';
  input.style.padding = '8px';
  input.style.border = '1px solid #ccc';
  input.style.borderRadius = '4px';
  input.style.outline = 'none';

  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.justifyContent = 'flex-end';
  btnContainer.style.gap = '10px';

  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = 'Cancel';
  cancelBtn.style.padding = '6px 12px';
  cancelBtn.style.border = '1px solid #ccc';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.backgroundColor = '#f9f9f9';
  cancelBtn.style.cursor = 'pointer';

  const okBtn = document.createElement('button');
  okBtn.innerText = 'OK';
  okBtn.style.padding = '6px 12px';
  okBtn.style.border = 'none';
  okBtn.style.borderRadius = '4px';
  okBtn.style.backgroundColor = '#2563eb';
  okBtn.style.color = '#fff';
  okBtn.style.cursor = 'pointer';

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(okBtn);

  modal.appendChild(text);
  modal.appendChild(input);
  modal.appendChild(btnContainer);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);

  input.focus();

  const close = (result: string | null) => {
    document.body.removeChild(overlay);
    callback(result);
  };

  cancelBtn.onclick = () => close(null);
  okBtn.onclick = () => close(input.value);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') close(input.value);
    if (e.key === 'Escape') close(null);
  };
};
