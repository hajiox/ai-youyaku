// app/components/ToneSampleModal.tsx
"use client";

import { useState, useEffect } from 'react';

interface ToneSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSample: string;
  onSave: (sample: string) => Promise<void>;
  maxLength: number;
  isSaving: boolean;
  saveError: string | null;
  saveSuccessMessage: string | null;
}

export default function ToneSampleModal({
  isOpen,
  onClose,
  currentSample,
  onSave,
  maxLength,
  isSaving,
  saveError,
  saveSuccessMessage,
}: ToneSampleModalProps) {
  const [sampleText, setSampleText] = useState("");
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSampleText(currentSample);
      setCharCount(currentSample.length);
    }
  }, [isOpen, currentSample]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let text = e.target.value;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength);
    }
    setSampleText(text);
    setCharCount(text.length);
  };

  const handleSaveClick = async () => {
    if (!sampleText.trim() && !currentSample) { // 新規登録時で空の場合はエラーにしても良い
        // もしエラーメッセージをモーダル内で表示するならここでセット
        return;
    }
    await onSave(sampleText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-700">口調サンプルを登録・編集</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl sm:text-3xl"
            aria-label="閉じる"
          >
            &times;
          </button>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mb-3">
          あなたのXポストなどを貼り付けてください。(最大{maxLength}文字)
          このサンプルに基づいて「自分の口調」での要約が可能になります。
        </p>
        <textarea
          rows={8}
          className="w-full text-sm p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2 resize-y"
          placeholder="ここに口調サンプルを入力..."
          value={sampleText}
          onChange={handleTextChange}
        />
        <div className="flex justify-between items-center mb-4 text-xs sm:text-sm text-slate-500">
          <span>{charCount}/{maxLength} 文字</span>
          {sampleText && <button onClick={() => {setSampleText(''); setCharCount(0);}} className="hover:underline">クリア</button>}
        </div>

        {saveError && (
          <p className="text-xs text-red-500 mb-2 p-2 bg-red-50 rounded-md">{saveError}</p>
        )}
        {saveSuccessMessage && (
          <p className="text-xs text-green-500 mb-2 p-2 bg-green-50 rounded-md">{saveSuccessMessage}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-md font-medium hover:bg-slate-50 transition-colors w-full sm:w-auto order-2 sm:order-1"
          >
            キャンセル
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isSaving || (!sampleText.trim() && !currentSample) || sampleText === currentSample} // 保存中、未入力(かつ初期値も空)、または変更なしの場合は無効化
            className={`px-4 py-2.5 bg-green-500 text-white text-sm rounded-md font-medium hover:bg-green-600 active:bg-green-700 transition-colors focus:outline-none focus:ring-1 focus:ring-green-400 focus:ring-offset-1 w-full sm:w-auto order-1 sm:order-2 ${
              (isSaving || (!sampleText.trim() && !currentSample) || sampleText === currentSample) ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? "保存中..." : "この内容で保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
