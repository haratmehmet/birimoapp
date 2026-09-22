'use client';
import { useState, useTransition } from 'react';
import { RequestForm } from './RequestForm';
import { AssignTeacherClient } from './AssignTeacherClient';
import { EditRequestModal } from './EditRequestModal';
import { FileText, Plus, CheckCircle, Clock, Trash2, Pencil, Search, ArrowLeft } from 'lucide-react';
import { deleteRequestAction } from './actions';

export function RequestsClient({ 
  requests, 
  students, 
  subjects,
  orgSettings
}: { 
  requests: any[], 
  students: any[], 
  subjects: any[],
  orgSettings: any
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'new' | 'assign'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [requestToDelete, setRequestToDelete] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const pendingRequests = requests.filter(r => 
    r.status === 'PENDING' && 
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const confirmDelete = () => {
    if (!requestToDelete) return;
    startTransition(async () => {
      await deleteRequestAction(requestToDelete.id);
      if (selectedRequest?.id === requestToDelete.id) {
        setSelectedRequest(null);
        setActiveTab('pending');
      }
      setRequestToDelete(null);
    });
  };

  const handleDelete = (e: React.MouseEvent, req: any) => {
    e.stopPropagation();
    setRequestToDelete(req);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* Left Pane: Pending Requests List */}
      <div className={`w-full lg:w-1/3 flex-col space-y-4 h-full ${activeTab === 'pending' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="flex-none items-center justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Bekleyen Talepler
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingRequests.length}
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-2 overflow-y-auto custom-scrollbar">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
              <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-sm font-medium">Tüm talepler karşılandı.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div 
                  key={req.id} 
                  onClick={() => {
                    setSelectedRequest(req);
                    setActiveTab('assign');
                  }}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    selectedRequest?.id === req.id 
                      ? 'bg-primary/5 border-primary shadow-sm' 
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-gray-900">{req.studentName}</div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingRequest(req); }}
                        className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                        title="Talebi Düzenle"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, req)}
                        disabled={isPending}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Talebi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {req.subjects.join(', ')}
                  </div>
                  {req.notes && (
                    <div className="mt-2 bg-amber-50 text-amber-800 text-[11px] p-2 rounded-lg border border-amber-100">
                      <strong>Not:</strong> {req.notes}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(req.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-none">
          <button 
            onClick={() => {
              setSelectedRequest(null);
              setActiveTab('new');
            }}
            className={`w-full py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${
              activeTab === 'new'
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-primary border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            Yeni Talep Oluştur
          </button>
        </div>
      </div>

      {/* Right Pane: Action Area */}
      <div className={`w-full lg:w-2/3 h-full overflow-hidden ${activeTab !== 'pending' ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Mobile Back Button */}
          {activeTab !== 'pending' && (
            <div className="lg:hidden mb-4 pb-2">
              <button 
                onClick={() => setActiveTab('pending')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-sm bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Taleplere Dön
              </button>
            </div>
          )}

          {activeTab === 'pending' && !selectedRequest && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 hidden lg:flex">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">İşlem yapmak için soldan bir talep seçin</p>
              <p className="text-sm mt-2">veya yeni bir talep oluşturun.</p>
            </div>
          )}

          {activeTab === 'new' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Yeni Eğitim Talebi</h2>
              <RequestForm 
                students={students} 
                subjects={subjects} 
                onSuccess={() => setActiveTab('pending')}
              />
            </div>
          )}

          {activeTab === 'assign' && selectedRequest && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Öğretmen Ata</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-semibold text-primary">{selectedRequest.studentName}</span> için öğretmen seçimi
                  </p>
                </div>
              </div>
              <AssignTeacherClient 
                request={selectedRequest} 
                allSubjects={subjects} 
                orgSettings={orgSettings}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Request Modal */}
      {editingRequest && (
        <EditRequestModal 
          request={editingRequest}
          subjects={subjects}
          onClose={() => setEditingRequest(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Talebi Sil</h3>
              <p className="text-sm text-gray-500 text-center">
                <strong className="text-gray-700">{requestToDelete.studentName}</strong> isimli öğrencinin eğitim talebini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={isPending}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
