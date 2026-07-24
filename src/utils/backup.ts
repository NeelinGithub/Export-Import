export const exportBackupData = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const backupData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rems_')) {
      backupData[key] = localStorage.getItem(key) || '';
    }
  }
  const dataStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rems_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem('rems_last_backup_date', new Date().toISOString());
};

export const importBackupData = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        for (const key in data) {
          if (key.startsWith('rems_')) {
            localStorage.setItem(key, data[key]);
          }
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
