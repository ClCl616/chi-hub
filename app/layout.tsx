import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './dashboard.css';
import { PwaRegister } from '@/components/pwa-register';
const geistSans=Geist({variable:'--font-geist-sans',subsets:['latin']});
const geistMono=Geist_Mono({variable:'--font-geist-mono',subsets:['latin']});
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000';
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:'CHI Toolbox',template:'%s · CHI Toolbox'},description:'나의 일상을 위한 도구 상자',manifest:'/manifest.webmanifest',openGraph:{title:'CHI Toolbox',description:'나의 일상을 위한 도구 상자',images:[{url:'/og-toolbox.png',width:1731,height:909,alt:'CHI Toolbox'}]},twitter:{card:'summary_large_image',title:'CHI Toolbox',description:'나의 일상을 위한 도구 상자',images:['/og-toolbox.png']}};
export const viewport:Viewport={themeColor:'#171916',width:'device-width',initialScale:1};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<PwaRegister/></body></html>}
