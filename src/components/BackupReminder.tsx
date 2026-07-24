import React, { useEffect, useState } from 'react';
import { DownloadCloud, X } from 'lucide-react';
import { exportBackupData } from '../utils/backup';

export default function BackupReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const lastBackup = localStorage.getItem('rems_last_backup_date');
    if (!lastBackup) {
      setShow(true);
      return;
    }
    const lastDate = new Date(lastBackup);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays >= 7) {
      setShow(true);
    }
  }, []);

  const handleBackup = () => {
    try {
      exportBackupData();
      alert("Backup downloaded successfully.");
      setShow(false);
    } catch (e) {
      alert("Failed to export backup.");
    }
  };

  const handleDismiss = () => {
    // Optionally save the date so it doesn't bother them again immediately
    // localStorage.setItem('rems_last_backup_date', new Date().toISOString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-indigo-600 px-4 py-3 text-white flex flex-col md:flex-row items-center justify-between shadow-sm relative z-50">
      <div className="flex items-center gap-3">
        <DownloadCloud className="w-5 h-5 text-indigo-200" />
        <span className="text-sm font-medium">
          Friendly reminder: It's been a while since your last backup. Would you like to save a backup for this week?
        </span>
      </div>
      <div className="flex items-center gap-3 mt-3 md:mt-0">
        <button
          onClick={handleBackup}
          className="bg-white text-indigo-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm hover:bg-indigo-50 transition"
        >
          Download Backup
        </button>
        <button
          onClick={handleDismiss}
          className="text-indigo-200 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
