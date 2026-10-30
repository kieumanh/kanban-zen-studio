package com.huongthiennature.kanban;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.view.ViewGroup;
import java.io.*;
import java.net.URLConnection;
import java.util.*;

/** Serves the installed shell at the production HTTPS origin; API cookies stay same-origin.
 * Only a bounded document-export bridge; no TLS overrides. Private data stays in app storage. */
public class MainActivity extends Activity {
 private static final String HOST="kanban.huongthiennature.com";
 private WebView web;
 private ValueCallback<Uri[]> chooser;
 private byte[] pendingExport;
 @Override public void onCreate(Bundle saved) {
  super.onCreate(saved);
  web=new WebView(this);setContentView(web,new ViewGroup.LayoutParams(-1,-1));
  web.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  CookieManager.getInstance().setAcceptCookie(true);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  WebViewClient client=new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){return bundled(req);}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
    Uri url=req.getUrl();
    if("https".equals(url.getScheme())&&HOST.equals(url.getHost()))return false;
    if("https".equals(url.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,url));}catch(Exception ignored){}}
    return true;
   }
  };
  web.setWebViewClient(client);
  web.addJavascriptInterface(new Object(){
   @JavascriptInterface public void exportFile(String encoded,String name,String mime){
    if(encoded==null||encoded.length()>34000000)return;
    try{byte[] bytes=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);if(bytes.length>25000000)return;
     runOnUiThread(()->{if(pendingExport!=null)return;pendingExport=bytes;Intent output=new Intent(Intent.ACTION_CREATE_DOCUMENT);output.setType(mime!=null&&mime.contains("/")?mime:"application/octet-stream");output.addCategory(Intent.CATEGORY_OPENABLE);output.putExtra(Intent.EXTRA_TITLE,(name==null?"kanban-export":name).replaceAll("[/\\\\]","_").substring(0,Math.min(150,(name==null?"kanban-export":name).length())));try{startActivityForResult(output,8);}catch(Exception error){pendingExport=null;}});
    }catch(Exception ignored){}
   }
  },"ZenNativeFiles");
  web.setDownloadListener((url,userAgent,disposition,mime,size)->{
   if(url.startsWith("blob:")){String quoted=org.json.JSONObject.quote(url);web.evaluateJavascript("fetch("+quoted+").then(r=>r.blob()).then(b=>{if(b.size>25000000)return;const reader=new FileReader();reader.onload=()=>{const link=[...document.querySelectorAll('a[download]')].find(a=>a.href==="+quoted+");ZenNativeFiles.exportFile(reader.result.split(',')[1],link?.download||'kanban-export',b.type||'application/octet-stream')};reader.readAsDataURL(b)})",null);return;}
   Uri uri=Uri.parse(url);if(!"https".equals(uri.getScheme())||!HOST.equals(uri.getHost()))return;
   try{android.app.DownloadManager.Request download=new android.app.DownloadManager.Request(uri);String cookie=CookieManager.getInstance().getCookie(url);if(cookie!=null)download.addRequestHeader("Cookie",cookie);download.setTitle(URLUtil.guessFileName(url,disposition,mime));download.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);((android.app.DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(download);}catch(Exception ignored){}
  });
  if(WebViewFeatureAvailable())ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){@Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest req){return bundled(req);}});
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> cb,FileChooserParams params){
    if(chooser!=null)chooser.onReceiveValue(null);chooser=cb;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("*/*");intent.addCategory(Intent.CATEGORY_OPENABLE);intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
    try{startActivityForResult(intent,7);return true;}catch(Exception error){chooser=null;return false;}
   }
  });
  if(saved==null)web.loadUrl("https://"+HOST+"/");else web.restoreState(saved);
 }
 private boolean WebViewFeatureAvailable(){return android.os.Build.VERSION.SDK_INT>=24;}
 private WebResourceResponse bundled(WebResourceRequest req){
  Uri url=req.getUrl();
  if(!"https".equals(url.getScheme())||!HOST.equals(url.getHost())||!"GET".equals(req.getMethod())||url.getPath().startsWith("/api/"))return null;
  String path=url.getPath().equals("/")?"index.html":url.getPath().substring(1);
  if(path.contains("..")||path.contains("\\"))return response(403,"Forbidden");
  try{
   InputStream bytes=getAssets().open(path);
   String mime=path.endsWith(".mjs")||path.endsWith(".js")?"text/javascript":URLConnection.guessContentTypeFromName(path);
   if(mime==null)mime=path.endsWith(".webmanifest")||path.endsWith(".json")?"application/json":path.endsWith(".svg")?"image/svg+xml":"application/octet-stream";
   return new WebResourceResponse(mime,"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-cache"),bytes);
  }catch(IOException error){return response(404,"Not Found");}
 }
 private WebResourceResponse response(int code,String reason){return new WebResourceResponse("text/plain","UTF-8",code,reason,Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(request==7&&chooser!=null){Uri[] values=null;if(result==RESULT_OK&&intent!=null){if(intent.getClipData()!=null){int count=intent.getClipData().getItemCount();values=new Uri[count];for(int i=0;i<count;i++)values[i]=intent.getClipData().getItemAt(i).getUri();}else if(intent.getData()!=null)values=new Uri[]{intent.getData()};}chooser.onReceiveValue(values);chooser=null;}
 if(request==8&&pendingExport!=null){try{if(result==RESULT_OK&&intent!=null&&intent.getData()!=null){try(OutputStream output=getContentResolver().openOutputStream(intent.getData())){if(output!=null)output.write(pendingExport);}}}catch(IOException ignored){}finally{pendingExport=null;}}}
 @Override protected void onPause(){CookieManager.getInstance().flush();super.onPause();}
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override public void onBackPressed(){web.evaluateJavascript("document.querySelector('dialog[open]')?.close()",null);}
}
