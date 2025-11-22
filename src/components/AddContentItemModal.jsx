import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { PLATFORMS } from '../constants/platforms'

export default function AddContentItemModal({ onClose, onSubmit }){
  const [form, setForm] = useState({ platform:'x', title:'', body:'', schedule_at:'', status:'writing' })
  const [files, setFiles] = useState([])
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">新建内容计划</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700">平台</label>
            <select value={form.platform} onChange={(e)=>setForm({...form, platform:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              {PLATFORMS.map(p=> (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">发布时间</label>
            <input type="datetime-local" value={form.schedule_at} onChange={(e)=>setForm({...form, schedule_at:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-sm text-gray-700">计划状态</label>
            <select value={form.status} onChange={(e)=>setForm({...form, status:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="writing">撰写中</option>
              <option value="review">待审核</option>
              <option value="published">已发布</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">标题</label>
            <input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-sm text-gray-700">正文</label>
            <textarea rows={4} value={form.body} onChange={(e)=>setForm({...form, body:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-sm text-gray-700">素材</label>
            <input type="file" multiple onChange={(e)=> setFiles(Array.from(e.target.files||[])) } className="hidden" id="content-assets"/>
            <label htmlFor="content-assets" className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="w-4 h-4"/><span>选择文件</span>
            </label>
            <div className="text-xs text-gray-500 mt-2">已选择 {files.length} 个文件</div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={()=> onSubmit && onSubmit({ ...form, files }) } className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">创建</button>
        </div>
      </div>
    </div>
  )
}
