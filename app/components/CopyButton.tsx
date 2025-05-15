"use client"

export default function CopyButton({ text }: { text: string }) {
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("コピーしました！"))
      .catch(() => alert("コピーに失敗しました"))
  }

  return (
    <button onClick={copyToClipboard} className="px-3 py-1 bg-black text-white text-sm rounded">
      Copy
    </button>
  )
}
