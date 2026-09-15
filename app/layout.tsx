import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './dashboard.css';
import { PwaRegister } from '@/components/pwa-register';
const geistSans=Geist({variable:'--font-geist-sans',subsets:['latin']});
const geistMono=Geist_Mono({variable:'--font-geist-mono',subsets:['latin']});
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000';
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:'CHI.HUB',template:'%s · CHI.HUB'},description:'기록하고, 몰입하고, 성장하는 나만의 공간.',manifest:'/manifest.webmanifest',openGraph:{title:'CHI.HUB',description:'기록하고, 몰입하고, 성장하는 나만의 공간.',images:[{url:'/og.png',width:1200,height:630,alt:'CHI.HUB'}]},twitter:{card:'summary_large_image',title:'CHI.HUB',description:'기록하고, 몰입하고, 성장하는 나만의 공간.',images:['/og.png']}};
export const viewport:Viewport={themeColor:'#171916',width:'device-width',initialScale:1};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<PwaRegister/></body></html>}
