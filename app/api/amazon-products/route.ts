// /app/api/amazon-products/route.ts ver.17
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

type Product = {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  source: string;
};

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function POST(req: NextRequest) {
  let payload: { isMobile?: boolean } = {};
  try { 
    payload = await req.json(); 
  } catch (e) {
    // エラーは無視
  }
  
  const isMobile = payload.isMobile ?? false;
  let registeredLinks: Product[] = [];
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('registered_links')
        .select('*')
        .eq('is_active', true);
      
      if (data && data.length > 0) {
        const displayCount = isMobile ? 1 : 2;
        const randomLinks = getRandomItems(data, displayCount);
        
        registeredLinks = randomLinks.map((item: any) => ({
          asin: item.id,
          title: item.title,
          url: item.url,
          imageUrl: item.ogp_image_url,
          source: 'registered-link',
        }));
      }
    } catch (e) {
      console.error("Supabase fetch error:", e);
    }
  }

  return NextResponse.json({ 
    products: registeredLinks,
    debugError: null
  });
}
