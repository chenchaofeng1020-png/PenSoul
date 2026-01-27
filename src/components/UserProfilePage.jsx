import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Camera, Save, Shield, Calendar, MapPin } from 'lucide-react';
import { uploadUserAvatar, getUser } from '../services/api';
import { useUI } from '../context/UIContext';

const UserProfilePage = ({ currentUser, email: propEmail, onUpdateUser }) => {
  const { showToast } = useUI();
  const [username, setUsername] = useState(currentUser || '');
  const [email, setEmail] = useState(propEmail || '');
  const [avatar, setAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [joinDate, setJoinDate] = useState('2024-01-01');
  const [isEditing, setIsEditing] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load data from localStorage
    const storedUsername = localStorage.getItem('username') || currentUser || '';
    const storedEmail = localStorage.getItem('email') || propEmail || ''; 
    const storedAvatar = localStorage.getItem('user_avatar') || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    
    // Simulate a join date if not stored (could store this too)
    const storedJoinDate = localStorage.getItem('join_date') || new Date().toISOString().split('T')[0];

    setUsername(storedUsername);
    setEmail(storedEmail);
    setAvatar(storedAvatar);
    setJoinDate(storedJoinDate);
    setOriginalUsername(storedUsername);
    setOriginalEmail(storedEmail);
  }, [currentUser, propEmail]);

  const hasChanges = (username !== originalUsername) || (email !== originalEmail);

  const handleEdit = () => {
    setOriginalUsername(username);
    setOriginalEmail(email);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setUsername(originalUsername);
    setEmail(originalEmail);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!isEditing || !hasChanges) return;
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('username', username);
      localStorage.setItem('email', email);
      localStorage.setItem('user_avatar', avatar);
      if (onUpdateUser) {
        onUpdateUser({ username, email, avatar });
      }
      setOriginalUsername(username);
      setOriginalEmail(email);
      setIsLoading(false);
      setIsEditing(false);
      showToast('基本资料保存成功！', 'success');
    }, 600);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('图片大小不能超过 5MB', 'warning');
        return;
      }
      
      try {
        // Show local preview immediately while uploading
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatar(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to backend
        const user = await getUser();
        const userId = user?.id || 'mock-user-1'; // Fallback for mock mode
        const { url } = await uploadUserAvatar(file, userId);
        
        if (url) {
          setAvatar(url);
          // Auto-save avatar
          localStorage.setItem('user_avatar', url);
          if (onUpdateUser) {
            onUpdateUser({ username, email, avatar: url });
          }
          
          // Avatar update notification
          showToast('头像已更新！', 'success');
        }
      } catch (error) {
        console.error('Failed to upload avatar', error);
        showToast('头像上传失败: ' + (error.message || '未知错误'), 'error');
      }
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      <div className="flex-shrink-0 border-b border-gray-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-lg font-semibold text-gray-900">个人中心</div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch lg:items-start">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Cover Image */}
              <div className="h-32 bg-gradient-to-r from-blue-500 via-blue-500 to-blue-500 relative">
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
              
              {/* Profile Info */}
              <div className="px-6 pb-8 text-center relative">
                {/* Avatar */}
                <div className="relative -mt-16 mb-4 inline-block group cursor-pointer" onClick={handleAvatarClick}>
                  <div className="relative p-1 bg-white rounded-full">
                    {avatar ? (
                      <img 
                        src={avatar} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-full object-cover shadow-md hover:shadow-lg transition-shadow duration-300"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm m-1">
                      <Camera className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-1">{username || '未设置昵称'}</h2>
                <p className="text-sm text-gray-500 mb-6">{email || '未设置邮箱'}</p>
                
                {/* Stats / Badges */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <Shield className="w-3 h-3 mr-1" />
                    管理员
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(joinDate).getFullYear()} 加入
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-6 text-left">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">账户信息</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                      <span>中国，北京</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="truncate">{email || '暂无邮箱'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">基本资料</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">可编辑</span>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={isLoading || !hasChanges}
                      className={`
                        relative overflow-hidden group
                        inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md shadow-blue-500/20
                        transition-all duration-300 ease-out
                        ${(isLoading || !hasChanges) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 hover:-translate-y-0.5'}
                      `}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1.5 transition-transform group-hover:scale-110" />
                          保存基本资料
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    编辑
                  </button>
                )}
              </div>
              
              <div className="p-6 md:p-8 space-y-8">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          用户名
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
                            placeholder="请输入用户名"
                          />
                        </div>
                        <p className="text-xs text-gray-400">这将显示在您的个人资料和团队页面中。</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-blue-500" />
                          邮箱地址
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
                            placeholder="yourname@example.com"
                          />
                        </div>
                        <p className="text-xs text-gray-400">用于接收通知和账户恢复。</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">个人简介</label>
                      <textarea 
                        rows="4"
                        className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none resize-none"
                        placeholder="介绍一下你自己..."
                      ></textarea>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          用户名
                        </label>
                        <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900">
                          {username || '未设置昵称'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-blue-500" />
                          邮箱地址
                        </label>
                        <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900">
                          {email || '未设置邮箱'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">个人简介</label>
                      <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500">未填写</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/30">
                <h3 className="text-lg font-semibold text-gray-900">安全设置</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">修改密码</h4>
                    <p className="text-sm text-gray-500 mt-1">定期修改密码可以保护您的账户安全</p>
                  </div>
                  <button onClick={() => setShowPasswordForm(true)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    修改
                  </button>
                </div>
                {showPasswordForm && (
                  <div className="mt-6 border-t border-gray-200 pt-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">当前密码</label>
                      <input
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
                        placeholder="请输入当前密码"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">新密码</label>
                        <input
                          type="password"
                          value={passwords.next}
                          onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                          className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
                          placeholder="请输入新密码"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">确认新密码</label>
                        <input
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                          className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
                          placeholder="请再次输入新密码"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const ok = passwords.current && passwords.next && passwords.confirm && passwords.next.length >= 6 && passwords.next === passwords.confirm;
                          if (!ok) {
                            showToast('请检查密码输入，长度至少6位且两次一致', 'warning');
                            return;
                          }
                          showToast('密码修改成功！', 'success');
                          setShowPasswordForm(false);
                          setPasswords({ current: '', next: '', confirm: '' });
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => { setShowPasswordForm(false); setPasswords({ current: '', next: '', confirm: '' }); }}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default UserProfilePage;
