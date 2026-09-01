import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'CHI.HUB',short_name:'CHI.HUB',description:'기록하고, 몰입하고, 성장하는 나만의 공간.',start_url:'/',display:'standalone',background_color:'#f4f2ec',theme_color:'#171916',lang:'ko',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]}}
