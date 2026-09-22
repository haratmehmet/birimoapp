'use client';

import { useActionState, useEffect, useState } from 'react';
import { importStudentsFromExcelAction } from './actions';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';

export function ExcelImportModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(importStudentsFromExcelAction, null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [state, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx-js-style');
    
    const data = [
      { 'Ad': 'Ahmet', 'Soyad': 'Yılmaz', 'Öğrenim Durumu': 'YKS', 'Sınıf': '12-A', 'Cinsiyet': 'Erkek', 'Telefon': '0 555 444 33 22', 'Paket Saati': 20, 'Saatlik Ücret': 1500 },
      { 'Ad': 'Ayşe', 'Soyad': 'Demir', 'Öğrenim Durumu': 'LGS', 'Sınıf': '8-B', 'Cinsiyet': 'Kız', 'Telefon': '0 544 333 22 11', 'Paket Saati': 0, 'Saatlik Ücret': 1200 },
    ];
    const ws = XLSX.utils.json_to_sheet(data);

    // Sütun genişlikleri (ölçeklendirme)
    ws['!cols'] = [
      { wch: 15 }, // Ad
      { wch: 15 }, // Soyad
      { wch: 20 }, // Öğrenim Durumu
      { wch: 12 }, // Sınıf
      { wch: 12 }, // Cinsiyet
      { wch: 20 }, // Telefon
      { wch: 15 }, // Paket Saati
      { wch: 15 }, // Saatlik Ücret
    ];

    // Başlık stili (Renklendirme ve Kalınlaştırma)
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
      fill: { fgColor: { rgb: "4F46E5" } }, // Tema rengi (Indigo)
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Veri stili
    const dataStyle = {
      alignment: { horizontal: "center", vertical: "center" }
    };
    
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H3');
    
    // Stilleri uygula
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[address]) continue;
        
        // 0. satır başlıklar
        if (R === 0) {
          ws[address].s = headerStyle;
        } else {
          ws[address].s = dataStyle;
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Öğrenciler');
    XLSX.writeFile(wb, 'ogrenci_sablonu.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Excel'den Yükle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 flex items-start gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-900">
            <FileSpreadsheet className="w-8 h-8 text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold mb-1">Toplu Öğrenci Yükleme</p>
              <p className="text-xs text-indigo-700/80 mb-3">
                Excel dosyasında "Ad, Soyad, Öğrenim Durumu, Sınıf, Cinsiyet, Telefon, Paket Saati, Saatlik Ücret" sütunları bulunmalıdır. Sisteme uygun şablonu aşağıdan indirebilirsiniz.
              </p>
              <button 
                type="button" 
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs font-bold bg-white text-primary px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Örnek Şablon İndir
              </button>
            </div>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group">
              <input 
                type="file" 
                name="file" 
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
              {fileName ? (
                <p className="text-sm font-bold text-primary">{fileName}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-900">Excel Dosyası Seçin</p>
                  <p className="text-xs text-gray-500 mt-1">Tıklayın veya sürükleyip bırakın</p>
                </>
              )}
            </div>

            {state?.error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 font-medium">{state.error}</div>}
            {state?.success && <div className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">{state.success}</div>}

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={pending || !fileName}
                className="flex-1 px-4 py-2.5 text-white bg-primary rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {pending ? 'Yükleniyor...' : 'Öğrencileri Aktar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
