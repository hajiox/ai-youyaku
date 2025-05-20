"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react"

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  const slides = [
    {
      image: "/tomato-curry.png",
      title: "会津トマトカレー",
      description: "地元産トマトの甘みと酸味が絶妙な一品",
    },
    {
      image: "/aizu-ramen.png",
      title: "会津ラーメン",
      description: "伝統の醤油ベースに地元の食材を活かした逸品",
    },
    {
      image: "/katsudon.png",
      title: "ソースカツ丼",
      description: "会津名物、サクサクのカツに特製ソースが絶品",
    },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  useEffect(() => {
    let interval
    if (autoplay) {
      interval = setInterval(() => {
        nextSlide()
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [autoplay, currentSlide])

  const newsItems = [
    {
      image: "/news1.png",
      title: "夏季限定メニュー登場！",
      date: "2023年6月1日",
      likes: 24,
      comments: 5,
    },
    {
      image: "/news2.png",
      title: "テイクアウト10%オフキャンペーン実施中",
      date: "2023年5月15日",
      likes: 18,
      comments: 3,
    },
    {
      image: "/news3.png",
      title: "新メニュー「会津山菜ラーメン」登場",
      date: "2023年4月20日",
      likes: 32,
      comments: 7,
    },
    {
      image: "/news4.png",
      title: "ゴールデンウィーク営業時間のお知らせ",
      date: "2023年4月10日",
      likes: 15,
      comments: 2,
    },
  ]

  const instagramPhotos = Array(9)
    .fill(0)
    .map((_, i) => `/instagram${i + 1}.jpg`)

  return (
    <main className="pt-16">
      {/* Hero Carousel */}
      <section className="relative h-[70vh] w-full overflow-hidden">
        <div className="relative h-full w-full">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={slide.image || "/placeholder.svg"}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <h1 className="mb-4 font-serif text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                  {slide.title}
                </h1>
                <p className="text-xl font-medium sm:text-2xl">{slide.description}</p>
              </div>
            </div>
          ))}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center pb-8">
            <p className="mb-6 text-center text-xl font-medium text-white">
              会津の味を全国へ──ラーメンとカツ丼とカレーの専門店
            </p>
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentSlide(index)
                    setAutoplay(false)
                  }}
                  className={`h-3 w-3 rounded-full ${index === currentSlide ? "bg-white" : "bg-white/50"}`}
                  aria-label={`スライド ${index + 1} に移動`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              prevSlide()
              setAutoplay(false)
            }}
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm transition-colors hover:bg-white/50"
            aria-label="前のスライド"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => {
              nextSlide()
              setAutoplay(false)
            }}
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm transition-colors hover:bg-white/50"
            aria-label="次のスライド"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </section>

      {/* 三大ラーメン紹介 */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center font-serif text-3xl font-bold text-gray-800 sm:text-4xl">会津三大ラーメン</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "会津醤油ラーメン",
              description: "伝統の醤油ダレと鶏ガラスープが生み出す深い味わい",
              image: "/shoyu-ramen.png",
            },
            {
              name: "会津味噌ラーメン",
              description: "地元の味噌を使用した、コクのある一杯",
              image: "/miso-ramen.png",
            },
            {
              name: "会津塩ラーメン",
              description: "あっさりとした中にも旨味が凝縮された塩ラーメン",
              image: "/shio-ramen.png",
            },
          ].map((ramen, index) => (
            <div
              key={index}
              className="group overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg"
            >
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={ramen.image || "/placeholder.svg"}
                  alt={ramen.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="mb-2 font-serif text-xl font-bold text-gray-800">{ramen.name}</h3>
                <p className="mb-4 text-gray-600">{ramen.description}</p>
                <Link
                  href="/aizu-ramen"
                  className="inline-flex items-center text-red-600 transition-colors hover:text-red-700"
                >
                  クリックで詳細 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 特徴セクション（4色ボックス） */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold text-gray-800 sm:text-4xl">当店の特徴</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "美味しい",
                description: "厳選された食材と伝統の技法で作る本格的な味わい",
                color: "bg-amber-100 text-amber-800 border-amber-200",
              },
              {
                title: "リーズナブル",
                description: "高品質な料理をお手頃価格でご提供",
                color: "bg-red-100 text-red-800 border-red-200",
              },
              {
                title: "早い",
                description: "効率的な調理システムで待ち時間を短縮",
                color: "bg-blue-100 text-blue-800 border-blue-200",
              },
              {
                title: "テイクアウト",
                description: "ご自宅でも当店の味をお楽しみいただけます",
                color: "bg-green-100 text-green-800 border-green-200",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className={`rounded-2xl border-2 p-6 text-center shadow-sm transition-transform hover:scale-[1.02] ${feature.color}`}
              >
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 季節メニュー */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="relative h-96 w-full sm:h-[500px]">
            <Image src="/aspara-tanmen.png" alt="アスパラタンメン" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h2 className="mb-2 font-serif text-3xl font-bold sm:text-4xl">季節限定メニュー</h2>
              <p className="text-xl font-medium">アスパラタンメン好評販売中！5月下旬まで</p>
            </div>
          </div>
        </div>
      </section>

      {/* 新着情報 */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold text-gray-800 sm:text-4xl">新着情報</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {newsItems.map((item, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg"
              >
                <div className="relative h-48 w-full">
                  <Image src={item.image || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <p className="mb-1 text-sm text-gray-500">{item.date}</p>
                  <h3 className="mb-3 font-medium">{item.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Heart className="mr-1 h-4 w-4" />
                      <span>{item.likes}</span>
                    </div>
                    <div className="flex items-center">
                      <MessageCircle className="mr-1 h-4 w-4" />
                      <span>{item.comments}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/news"
              className="inline-block rounded-full border-2 border-red-600 px-6 py-2 font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
            >
              もっと見る
            </Link>
          </div>
        </div>
      </section>

      {/* Instagramギャラリー */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center font-serif text-3xl font-bold text-gray-800 sm:text-4xl">Instagram</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6">
          {instagramPhotos.map((photo, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-2xl">
              <Image
                src={photo || "/placeholder.svg"}
                alt={`Instagram photo ${index + 1}`}
                width={400}
                height={400}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-medium text-red-600 transition-colors hover:text-red-700"
          >
            Instagramでフォローする <ChevronRight className="ml-1 h-4 w-4" />
          </a>
        </div>
      </section>
    </main>
  )
}
