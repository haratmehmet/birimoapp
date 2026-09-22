'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, X, Key, User, Trash2 } from 'lucide-react';
import { updateUserCredentialsAction, deleteUserAction } from './actions';
import { UserForm } from './UserForm';

type Role = { id: string, name: string };
type UserItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isActive: boolean;
  role: string | null;
  roleId: string | null;
};

export function UsersClient({ users, roles }: { users: UserItem[], roles: Role[] }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const handleEditClick = (u: UserItem) => {
    setEditUser(u);
    setEditUsername(u.email);
    setEditPassword('');
    setUpdateError('');
    setUpdateSuccess('');
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    if (!editUsername) {
      setUpdateError('Kullanıcı adı boş olamaz.');
      return;
    }
    
    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');
    
    const res = await updateUserCredentialsAction(editUser.id, editUsername, editPassword);
    setIsUpdating(false);
    
    if (res.error) {
      setUpdateError(res.error);
    } else {
      setUpdateSuccess('Kullanıcı başarıyla güncellendi.');
      setTimeout(() => {
        setEditUser(null);
      }, 1500);
    }
  };

  const isStaffRole = (r: string, n: string) => {
    const roleLower = (r || '').toLowerCase();
    const nameLower = (n || '').toLowerCase();
    return roleLower === 'staff' || roleLower.includes('yetkili') || nameLower.includes('yetkili');
  };

  const isAdminRole = (r: string, n: string) => {
    const roleLower = (r || '').toLowerCase();
    const nameLower = (n || '').toLowerCase();
    if (isStaffRole(r, n)) return false;
    return roleLower.includes('admin') || roleLower.includes('yönetici') || roleLower.includes('yonetici') || nameLower.includes('yönetici') || nameLower.includes('yonetici');
  };

  const isTeacherRole = (r: string, n: string) => {
    const roleLower = (r || '').toLowerCase();
    return roleLower.includes('teacher') || roleLower.includes('öğretmen') || roleLower.includes('ogretmen');
  };

  const adminUsers = users.filter(u => isAdminRole(u.role || '', (u.firstName || '') + ' ' + (u.lastName || '')));
  const staffUsers = users.filter(u => isStaffRole(u.role || '', (u.firstName || '') + ' ' + (u.lastName || '')));
  const teacherUsers = users.filter(u => isTeacherRole(u.role || '', (u.firstName || '') + ' ' + (u.lastName || '')));
  const otherUsers = users.filter(u => !adminUsers.includes(u) && !staffUsers.includes(u) && !teacherUsers.includes(u));

  const renderTable = (userList: UserItem[], emptyMessage: string) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="overflow-x-auto min-w-0 w-full pb-2 custom-scrollbar">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="text-xs text-gray-400 uppercase bg-gray-50/80">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-500">Adı Soyadı</th>
              <th className="px-6 py-4 font-bold text-gray-500">Kullanıcı Adı</th>
              <th className="px-6 py-4 font-bold text-gray-500">Rol</th>
              <th className="px-6 py-4 font-bold text-right text-gray-500">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {userList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              userList.map((u) => {
                const n = ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase();
                const isStaff = isStaffRole(u.role || '', n);
                const isAdmin = isAdminRole(u.role || '', n);
                const isTeacher = isTeacherRole(u.role || '', n);
                
                let roleDisplay = u.role || 'Bilinmiyor';
                let roleColor = 'bg-gray-100 text-gray-600 border border-gray-200';
                
                if (isStaff) {
                  roleDisplay = 'Yetkili';
                  roleColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                } else if (isAdmin) {
                  roleDisplay = 'Kurum Yöneticisi';
                  roleColor = 'bg-purple-50 text-purple-700 border border-purple-200';
                } else if (isTeacher) {
                  roleDisplay = 'Öğretmen';
                  roleColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                }
                
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${roleColor}`}>
                        {roleDisplay}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEditClick(u)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ml-auto font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#004aad] tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500 font-medium">
            Kurumunuzdaki yöneticileri, yetkilileri ve öğretmenleri yönetin.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Kullanıcı / Yetkili Ekle
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 ml-1">Yöneticiler</h2>
        {renderTable(adminUsers, 'Henüz yönetici bulunmuyor.')}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 ml-1">Kurum Yetkilileri</h2>
        {renderTable(staffUsers, 'Henüz kurum yetkilisi bulunmuyor.')}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 ml-1">Öğretmenler</h2>
        {renderTable(teacherUsers, 'Henüz öğretmen bulunmuyor.')}
      </div>

      {otherUsers.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3 ml-1">Diğer Kullanıcılar</h2>
          {renderTable(otherUsers, '')}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:pl-[17rem]">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Yeni Kullanıcı Ekle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <UserForm roles={roles} onSuccess={() => setIsAddModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:pl-[17rem]">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Kullanıcıyı Düzenle</h3>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl relative">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {editUser.firstName?.[0] || ''}{editUser.lastName?.[0] || ''}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{editUser.firstName || ''} {editUser.lastName || ''}</div>
                  <div className="text-xs text-gray-500">{editUser.role?.toLowerCase().includes('admin') ? 'Yönetici' : 'Öğretmen'}</div>
                </div>
                <form 
                  action={async (formData) => {
                    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
                      await deleteUserAction(null, formData);
                      setEditUser(null);
                    }
                  }}
                  className="absolute right-4 top-4"
                >
                  <input type="hidden" name="userId" value={editUser.id} />
                  <button type="submit" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Kullanıcıyı Sil">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </form>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Yeni Şifre <span className="text-gray-400 font-normal">(Değiştirmek istemiyorsanız boş bırakın)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>

              {updateError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl font-medium">
                  {updateError}
                </div>
              )}
              {updateSuccess && (
                <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-xl font-medium">
                  {updateSuccess}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setEditUser(null)}
                  className="flex-1 rounded-xl"
                >
                  İptal
                </Button>
                <Button 
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl"
                >
                  {isUpdating ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}