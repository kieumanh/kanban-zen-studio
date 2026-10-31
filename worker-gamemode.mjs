const GAME_ORIGIN = 'https://kanban.gamemode.huongthiennature.com';
const BACKEND_ORIGIN = 'https://kanban.huongthiennature.com';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({ok:true,version:'1.17.0',mode:'game',source:'experiment/game-mode',backend:'shared-kanban-account'},{headers:{'Cache-Control':'no-store'}});
    if (url.origin !== GAME_ORIGIN) return new Response('Unknown hostname',{status:421});
    if (url.pathname.startsWith('/api/')) {
      const origin=request.headers.get('Origin');
      if (origin && origin !== GAME_ORIGIN) return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
      if (!['GET','HEAD'].includes(request.method) && origin !== GAME_ORIGIN) return Response.json({error:'Thiếu xác nhận nguồn yêu cầu.'},{status:403});
      const target=new URL(url.pathname+url.search,BACKEND_ORIGIN),headers=new Headers(request.headers);
      headers.delete('Host');
      if(origin)headers.set('Origin',BACKEND_ORIGIN);
      headers.set('Referer',BACKEND_ORIGIN+'/');
      const upstream=new Request(target.toString(),{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',duplex:'half'});
      const response=await env.BACKEND.fetch(upstream);
      const result=new Response(response.body,response);
      result.headers.set('Cache-Control','no-store');
      result.headers.set('X-Game-Mode','shared-account');
      // Keep cookies host-only: the browser scopes backend session cookies to this hostname.
      const location=result.headers.get('Location');
      if(location?.startsWith(BACKEND_ORIGIN+'/'))result.headers.set('Location',GAME_ORIGIN+location.slice(BACKEND_ORIGIN.length));
      return result;
    }
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    return env.ASSETS.fetch(request);
  }
};
