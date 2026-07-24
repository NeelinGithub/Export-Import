import React, { useState, useMemo } from 'react';
import { 
  Folder, File as FileIcon, UploadCloud, Plus, HardDrive, 
  Download, AlertCircle, ChevronRight, Home, Trash2, RotateCcw,
  Check, X
} from 'lucide-react';
import { getAccessToken, googleSignIn } from '../firebase';

interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  sizeMB?: number; // in MB
  parentId: string | null;
  date: string;
}

interface DocumentDriveProps {
  isAdmin?: boolean;
}

export default function DocumentDrive({ isAdmin = false }: DocumentDriveProps) {
  const MAX_STORAGE_MB = 500;
  const MAX_DOWNLOADS_PER_MONTH = 1;

  const [items, setItems] = useState<DriveItem[]>([
    { id: 'f1', name: 'Export Customs', type: 'folder', parentId: null, date: '2026-05-15' },
    { id: 'f2', name: 'Signed Contracts', type: 'folder', parentId: null, date: '2026-05-20' },
    { id: 'file1', name: 'Phyto_Specimen.pdf', type: 'file', sizeMB: 2.5, parentId: 'f1', date: '2026-05-16' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [downloadsUsed, setDownloadsUsed] = useState(0);
  const [deletedDatabase, setDeletedDatabase] = useState<DriveItem[]>([]);
  const [viewDeleted, setViewDeleted] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const usedSpaceMB = useMemo(() => {
    return items.filter(i => i.type === 'file').reduce((acc, curr) => acc + (curr.sizeMB || 0), 0);
  }, [items]);

  const currentItems = useMemo(() => {
    return items.filter(i => i.parentId === currentFolderId);
  }, [items, currentFolderId]);

  // Breadcrumbs calculation
  const breadcrumbs = useMemo(() => {
    const crumbs: {id: string, name: string}[] = [];
    let curr = currentFolderId;
    while (curr) {
      const folder = items.find(i => i.id === curr);
      if (folder) {
        crumbs.unshift({ id: folder.id, name: folder.name });
        curr = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  }, [currentFolderId, items]);

  const handleConfirmCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setItems([...items, {
      id: 'folder_' + Date.now(),
      name: newFolderName.trim(),
      type: 'folder',
      parentId: currentFolderId,
      date: new Date().toISOString().split('T')[0]
    }]);
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const [dailyUploads, setDailyUploads] = useState(0);
  const [downloadedVolume, setDownloadedVolume] = useState(0);

  const [GDriveConnected, setGDriveConnected] = useState(false);

  React.useEffect(() => {
    getAccessToken().then(token => {
      if (token) setGDriveConnected(true);
    });
  }, []);

  const handleConnectGoogleDrive = async () => {
    try {
      const result = await googleSignIn();
      if (result?.accessToken) {
        setGDriveConnected(true);
        alert("Google Drive connected successfully!");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to connect Google Drive.");
    }
  };

  const hiddenFileInput = React.useRef<HTMLInputElement>(null);

  const handleUploadSimulate = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    let name = `Uploaded_Certificate_${items.filter(i => i.type === 'file').length + 1}.pdf`;
    let simSize = 0;
    let file: File | null = null;

    if (e && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
      name = file.name;
      simSize = file.size / (1024 * 1024);
      e.target.value = ''; // Reset input
    } else {
      alert("No file selected.");
      return;
    }

    if (simSize > 15) {
      alert("File exceeds the 15 MB limit per file.");
      return;
    }
    if (file.type !== 'application/pdf') {
      alert("Only PDF files are allowed.");
      return;
    }
    if (dailyUploads >= 20) {
      alert("Daily upload limit of 20 files reached.");
      return;
    }
    if (usedSpaceMB + simSize > MAX_STORAGE_MB) {
      alert(`Cannot upload! Drive total capacity limit of ${MAX_STORAGE_MB}MB exceeded.`);
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      const confirmed = window.confirm("You need to connect Google Drive to upload. Connect now?");
      if (confirmed) {
        const result = await googleSignIn();
        if (result && result.accessToken) token = result.accessToken;
        else return;
      } else {
        return;
      }
    }

    try {
      const metadata = { name: name, mimeType: file.type };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);
      
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload to Google Drive failed.');
      const data = await res.json();
      
      setDailyUploads(prev => prev + 1);
      setItems([...items, {
        id: data.id || 'file_' + Date.now(),
        name: name,
        type: 'file',
        sizeMB: parseFloat(simSize.toFixed(2)),
        parentId: currentFolderId,
        date: new Date().toISOString().split('T')[0]
      }]);
      alert("File uploaded to Google Drive successfully.");
    } catch (err: any) {
       console.error(err);
       alert("Error uploading file: " + err.message);
    }
  };

  const triggerUploadClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click();
    }
  };

  const handleDownload = async (fileItem: DriveItem) => {
    if (downloadsUsed >= MAX_DOWNLOADS_PER_MONTH) {
      alert(`Monthly Download Limit Reached!\n\nYour current plan restricts downloading from this Drive to ${MAX_DOWNLOADS_PER_MONTH} time(s) per month. You have already used your quota.`);
      return;
    }
    if (fileItem.sizeMB && downloadedVolume + fileItem.sizeMB > 500) {
      alert("Monthly download volume limit of 500 MB reached.");
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      const confirmed = window.confirm("You need to connect Google Drive to download. Connect now?");
      if (confirmed) {
        const result = await googleSignIn();
        if (result && result.accessToken) token = result.accessToken;
        else return;
      } else {
        return;
      }
    }

    try {
      // Direct file fetch if id does not start with 'file_' (meaning it's a real Drive ID)
      if (!fileItem.id.startsWith('file_')) {
         const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileItem.id}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (!res.ok) throw new Error('Download from Google Drive failed.');
         const blob = await res.blob();
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = fileItem.name;
         document.body.appendChild(link);
         link.click();
         link.remove();
         window.URL.revokeObjectURL(url);
      } else {
         alert("This file is a simulated file and cannot be downloaded from Google Drive.");
      }
      setDownloadsUsed(downloadsUsed + 1);
      if (fileItem.sizeMB) setDownloadedVolume(downloadedVolume + fileItem.sizeMB);
    } catch(err: any) {
      console.error(err);
      alert("Error downloading file: " + err.message);
    }
  };

  const handleDelete = (id: string, type: 'folder' | 'file') => {
    const confirmMessage = "PERMANENT DELETION WARNING\n\nAfter deletion, recovery of this document is not possible. It is the user's responsibility to manage the documents.\n\nAre you sure you want to permanently delete this item?";
    
    if (window.confirm(confirmMessage)) {
      if (type === 'folder') {
        const hasChildren = items.some(i => i.parentId === id);
        if (hasChildren) {
           if (!window.confirm("This folder is not empty. All contents inside will also be permanently deleted. Proceed?")) {
               return;
           }
        }
      }

      const itemToDelete = items.find(i => i.id === id);
      if (itemToDelete) {
        // "Admin back-end" save for 6 months
        setDeletedDatabase([...deletedDatabase, { ...itemToDelete, id: `del_${itemToDelete.id}` }]);
      }
      
      // If folder, recursively delete children
      if (type === 'folder') {
         setItems(items.filter(i => i.id !== id && i.parentId !== id)); // Simple depth 1 delete for now
      } else {
         setItems(items.filter(i => i.id !== id));
      }
    }
  };

  const usagePercent = (usedSpaceMB / MAX_STORAGE_MB) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6 my-8 px-4">
      {/* Header & Limits */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0 relative overflow-hidden">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">EXPORTPRODOCS Drive</h2>
              {GDriveConnected ? (
                <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1 uppercase">
                  <Check className="w-3 h-3" /> GDrive Synced
                </span>
              ) : (
                <button 
                  onClick={handleConnectGoogleDrive}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 border border-blue-200 text-blue-700 text-[10px] font-bold rounded flex items-center gap-1 uppercase transition"
                >
                  <svg className="w-3 h-3" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 22.08 38.22h44.16l-22.08-38.22z" fill="#0066da"/>
                    <path d="m43.65 2.5-22.08 38.22 22.08 38.22 22.08-38.22z" fill="#00ac47"/>
                    <path d="m80.7 66.85-22.08-38.22h-44.16l22.08 38.22z" fill="#ea4335"/>
                    <path d="m6.6 66.85 22.08-38.22h44.16l-22.08 38.22z" fill="#ffba00"/>
                  </svg>
                  Connect Google Drive
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium">Securely organize compliance certificates and workspace documents in folders.</p>
          </div>
        </div>

        {/* Quota Section */}
        <div className="flex flex-col gap-3 min-w-[240px] bg-gray-50 border border-gray-100 rounded-2xl p-4 md:w-72">
          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-gray-400" /> Storage Usage</span>
            <span>{usedSpaceMB.toFixed(1)} MB / {MAX_STORAGE_MB} MB</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} 
              style={{ width: `${Math.min(usagePercent, 100)}%` }} 
            />
          </div>
          
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Monthly Downloads</span>
            <span className={`font-black ${downloadsUsed >= MAX_DOWNLOADS_PER_MONTH ? 'text-red-500' : 'text-emerald-600'}`}>
              {MAX_DOWNLOADS_PER_MONTH - downloadsUsed} Left
            </span>
          </div>
        </div>
      </div>

      {/* Drive Main Panel */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Drive Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 overflow-x-auto text-sm text-gray-600 font-medium whitespace-nowrap scrollbar-none pb-1 sm:pb-0">
            <button 
              onClick={() => setCurrentFolderId(null)}
              className={`hover:text-indigo-600 transition flex items-center gap-1 ${!currentFolderId ? 'text-gray-900 font-bold' : ''}`}
            >
              <Home className="w-4 h-4" /> My Drive
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button 
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={`hover:text-indigo-600 transition ${idx === breadcrumbs.length - 1 ? 'text-gray-900 font-bold' : ''}`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAdmin && (
              <button 
                onClick={() => {
                  setViewDeleted(!viewDeleted);
                  if (!viewDeleted) setCurrentFolderId(null);
                }}
                className={`px-4 py-2 ${viewDeleted ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'} text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5`}
              >
                <Trash2 className="w-4 h-4" /> {viewDeleted ? 'Exit Admin Trash' : 'View Admin Trash'}
              </button>
            )}
            {isCreatingFolder ? (
              <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-2 py-1 shadow-sm h-8">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Folder Name..." 
                  className="text-xs font-bold outline-none w-28 bg-transparent pl-1 text-gray-800 placeholder-gray-400"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmCreateFolder();
                    if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
                  }}
                />
                <button 
                  onClick={handleConfirmCreateFolder}
                  className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                  className="p-1 hover:bg-red-50 text-red-500 rounded transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New Folder
              </button>
            )}
            <button 
              onClick={triggerUploadClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" /> Upload File
            </button>
            <input 
              type="file" 
              ref={hiddenFileInput} 
              style={{ display: 'none' }} 
              onChange={handleUploadSimulate} 
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
            />
          </div>
        </div>

        {/* Folder / File List */}
        <div className="p-4 flex-1 bg-white">
          {viewDeleted ? (
            <div className="flex flex-col h-full">
              <div className="mb-4 bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Admin Back-end: 180-Day Deleted Document Retention Log. These records are hidden from standard users.</span>
              </div>
              {deletedDatabase.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                    <Trash2 className="w-8 h-8"/>
                  </div>
                  <h3 className="text-gray-900 font-bold mb-1">Trash is empty</h3>
                  <p className="text-gray-400 text-sm max-w-xs">No documents have been deleted recently.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deletedDatabase.map(delItem => (
                    <div 
                      key={delItem.id}
                      className="group flex flex-col p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-300 hover:shadow-md transition select-none opacity-80"
                    >
                      <div className="flex items-start justify-between mb-4">
                        {delItem.type === 'folder' ? (
                          <Folder className="w-8 h-8 text-amber-500 fill-amber-50 shrink-0" />
                        ) : (
                          <FileIcon className="w-8 h-8 text-amber-500 stroke-[1.5px] fill-amber-50 shrink-0" />
                        )}
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              // check if 'Restored' folder exists at root level
                              let restoredFolder = items.find(i => i.name === 'Restored' && i.type === 'folder' && i.parentId === null);
                              let newItems = [...items];
                              if (!restoredFolder) {
                                restoredFolder = {
                                  id: 'folder_restored_' + Date.now(),
                                  name: 'Restored',
                                  type: 'folder',
                                  parentId: null,
                                  date: new Date().toISOString().split('T')[0]
                                };
                                newItems.push(restoredFolder);
                              }

                              const restoredItem: DriveItem = {
                                ...delItem,
                                id: delItem.id.replace('del_', ''), // remove prefix if needed, or create new id
                                parentId: restoredFolder.id,
                                name: delItem.name.includes('(Restored)') ? delItem.name : `${delItem.name} (Restored)`
                              };

                              setItems([...newItems, restoredItem]);
                              setDeletedDatabase(deletedDatabase.filter(d => d.id !== delItem.id));
                              alert(`Document "${delItem.name}" restored to the "Restored" folder successfully.`);
                            }}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition shrink-0 flex items-center gap-1 bg-gray-100"
                            title="Recover & Restore"
                          >
                            <RotateCcw className="w-4 h-4" /> <span className="text-[10px] font-bold">Recover</span>
                          </button>
                        </div>
                      </div>
                      <span className="font-semibold text-sm text-gray-900 truncate leading-tight mb-1 cursor-default line-through" title={delItem.name}>
                        {delItem.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-amber-600 mt-1 font-bold">
                        <span>DELETED</span>
                        {delItem.sizeMB && (
                          <>
                            <span className="w-1 h-1 bg-amber-300 rounded-full" />
                            <span>{delItem.sizeMB?.toFixed(2)} MB</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                <Folder className="w-8 h-8"/>
              </div>
              <h3 className="text-gray-900 font-bold mb-1">This folder is empty</h3>
              <p className="text-gray-400 text-sm max-w-xs">Click inside the top toolbar to upload files or construct a nested directory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Render Folders first */}
              {currentItems.filter(i => i.type === 'folder').map(folder => (
                <div 
                  key={folder.id}
                  className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition cursor-pointer select-none"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <Folder className="w-6 h-6 text-indigo-400 shrink-0 fill-indigo-50" />
                    <span className="font-semibold text-sm text-gray-800 truncate">{folder.name}</span>
                  </div>
                  <button 
                     onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folder'); }}
                     className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition focus:opacity-100"
                  >
                     <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Render Files */}
              {currentItems.filter(i => i.type === 'file').map(file => (
                 <div 
                 key={file.id}
                 className="group flex flex-col p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition select-none"
               >
                 <div className="flex items-start justify-between mb-4">
                   <FileIcon className="w-8 h-8 text-blue-500 stroke-[1.5px] fill-blue-50 shrink-0" />
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition focus-within:opacity-100">
                     <button 
                       onClick={() => handleDownload(file)}
                       className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition shrink-0"
                       title="Download File"
                     >
                       <Download className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => handleDelete(file.id, 'file')}
                       className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                       title="Delete File"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
                 <span className="font-semibold text-sm text-gray-900 truncate leading-tight mb-1 cursor-default" title={file.name}>
                   {file.name}
                 </span>
                 <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 font-medium">
                   <span>{file.sizeMB?.toFixed(2)} MB</span>
                   <span className="w-1 h-1 bg-gray-300 rounded-full" />
                   <span>{file.date}</span>
                 </div>
               </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
