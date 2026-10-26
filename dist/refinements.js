'use strict';
function fitCheckText(input){input.style.height='auto';input.style.height=Math.max(36,input.scrollHeight)+'px';}
const taskDetailBeforeCompact=taskDetail;taskDetail=function(p,t){taskDetailBeforeCompact(p,t);document.querySelectorAll('.compact-check textarea').forEach(fitCheckText);};
document.addEventListener('input',e=>{if(e.target.matches('.compact-check textarea'))fitCheckText(e.target);});
document.addEventListener('change',e=>{if(e.target.matches('.compact-check input[name^="check-done-"]'))e.target.closest('.compact-check').classList.toggle('is-complete',e.target.checked);});
document.addEventListener('click',e=>{const remove=e.target.closest('[data-compact-remove]'),undo=e.target.closest('[data-compact-undo]');if(remove){const i=remove.dataset.compactRemove,row=remove.closest('.compact-check');row.querySelector('[name="check-remove-'+i+'"]').checked=true;row.hidden=true;row.insertAdjacentHTML('afterend','<button type="button" class="text-btn check-undo" data-compact-undo="'+i+'">Đã bỏ mục · Hoàn tác</button>');}if(undo){const i=undo.dataset.compactUndo,input=$('#editor-form [name="check-remove-'+i+'"]');input.checked=false;input.closest('.compact-check').hidden=false;undo.remove();}});
function openWeeklyReport(){if(document.querySelector('.report-dialog'))return;const dialog=document.createElement('dialog');dialog.className='report-dialog';dialog.setAttribute('aria-label','Xem trước tổng kết tuần');dialog.innerHTML='<div class="report-dialog-toolbar"><div><strong>Tổng kết tuần</strong><small>Bản xem trước giống nội dung email</small></div><div><button type="button" class="btn" id="share-report-preview">Chia sẻ web</button><button type="button" class="btn" id="print-weekly-report" disabled>'+svgIcon('download')+'In / Lưu PDF</button><button type="button" class="icon-btn" id="close-weekly-report" aria-label="Đóng báo cáo">×</button></div></div><p class="report-print-hint">Để xuất PDF: chọn “Lưu dưới dạng PDF” trong hộp thoại in.</p><p id="report-preview-status" role="status">Đang chuẩn bị báo cáo…</p><iframe title="Báo cáo tổng kết tuần" id="weekly-report-frame" sandbox="allow-same-origin allow-modals" hidden></iframe>';document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('#close-weekly-report').onclick=()=>dialog.close();dialog.querySelector('#share-report-preview').onclick=()=>openReportShare();dialog.showModal();requestAPI('weekly-report').then(report=>{if(!dialog.isConnected)return;const frame=dialog.querySelector('iframe');frame.onload=()=>{dialog.querySelector('#report-preview-status').hidden=true;dialog.querySelector('#print-weekly-report').disabled=false;};frame.srcdoc=report.html;frame.hidden=false;dialog.querySelector('#print-weekly-report').onclick=()=>{frame.contentWindow.focus();frame.contentWindow.print();};}).catch(err=>{if(dialog.isConnected)dialog.querySelector('#report-preview-status').textContent=err.message;});}
Object.assign(iconPaths,{resources:'M3 4h18v16H3z M3 15l5-5 5 5 3-3 5 5 M15 8h.01',download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4'});
const resourcesNav=document.createElement('button');resourcesNav.type='button';resourcesNav.className='nav';resourcesNav.dataset.view='resources';resourcesNav.innerHTML='<span>'+svgIcon('resources')+'</span>Tài nguyên';document.querySelector('.sidebar nav').insertBefore(resourcesNav,trashNav);
let resourceState={owner:'',files:[],total:0,used:0,offset:0,kind:'all',scope:'',search:'',key:'',loading:false,error:''},resourceTimer;
function resourceLink(f,preview=false){return '/api/'+(f.source==='legacy'?'files':'assets')+'/'+encodeURIComponent(f.id)+(preview?'?preview=1':'');}
function resourceSource(f){const bits=f.scope.split(':');if(bits[0]==='note'){const n=data.notes?.find(n=>n.id===bits[1]);return n?'Ghi chú · '+n.title:'Ghi chú đã xóa';}const p=data.projects.find(p=>p.id===bits[1]);if(!p)return 'Dự án đã xóa';const task=bits[2]==='task'?p.tasks.find(t=>t.id===bits[3]):null;return p.name+(p.archived?' · Lưu trữ':'')+(task?' · '+task.title:'');}
function resourceDate(value){return new Date(value).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'});}
const RESOURCE_KIND={image:'Hình ảnh',video:'Video',audio:'Âm thanh',document:'Tài liệu'};
function resourceThumbnail(f){if((f.source==='r2'&&f.mime.startsWith('image/')||f.source==='legacy'&&f.kind==='image')&&f.size<=5000000)return '<img loading="lazy" decoding="async" src="'+resourceLink(f,true)+'" alt="'+esc(f.name)+'">';return '<span class="resource-file-symbol" aria-hidden="true">'+({image:'▧',video:'▷',audio:'♫',document:'▤'}[f.kind]||'▤')+'</span><small>'+esc(RESOURCE_KIND[f.kind]||'Tệp')+'</small>';}
function resourcesPage(){const s=resourceState;return heading('RESOURCE VIEWS','Tài nguyên','Tất cả tệp trong dự án và ghi chú của bạn.','<div class="resource-page-actions"><button type="button" class="btn primary" data-resource-upload><span aria-hidden="true">↑</span> Tải tệp lên</button><button type="button" class="btn" data-resources-refresh>'+svgIcon('sync')+'Làm mới</button></div>')+'<div class="resource-filters"><label>Loại tệp<select id="resource-kind"><option value="all">Tất cả</option>'+Object.entries(RESOURCE_KIND).map(([key,label])=>'<option value="'+key+'" '+(s.kind===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Nơi lưu<select id="resource-scope"><option value="">Tất cả nguồn</option><option value="note" '+(s.scope==='note'?'selected':'')+'>Ghi chú</option>'+data.projects.map(p=>'<option value="project:'+esc(p.id)+'" '+(s.scope==='project:'+p.id?'selected':'')+'>'+esc(p.name)+(p.archived?' · Lưu trữ':'')+'</option>').join('')+'</select></label><p>'+s.total+' tệp · '+formatSize(s.used)+' đang dùng<small>Gồm Thùng rác và tệp đang tải · Chỉ bạn xem được</small></p></div><div id="resource-album" class="resource-album" '+(s.loading?'aria-busy="true"':'')+'>'+(s.error?'<p class="empty">'+esc(s.error)+'</p>':!s.files.length?'<p class="empty">'+(s.loading?'Đang tải tài nguyên…':'Chưa có tệp phù hợp. Chọn “Tải tệp lên” để lưu ngay tại đây, hoặc thêm tệp trong dự án và ghi chú.')+'</p>':s.files.map(f=>'<article class="resource-card"><button type="button" class="resource-cover kind-'+f.kind+'" data-resource-detail="'+esc(f.source+':'+f.id)+'" aria-label="Xem '+esc(f.name)+'">'+resourceThumbnail(f)+'</button><div class="resource-card-info"><h3 title="'+esc(f.name)+'">'+esc(f.name)+'</h3><small>'+formatSize(f.size)+' · '+esc(resourceDate(f.created))+'</small><p title="'+esc(resourceSource(f))+'">'+esc(resourceSource(f))+'</p><div><button type="button" class="text-btn" data-resource-detail="'+esc(f.source+':'+f.id)+'">Chi tiết</button><a class="text-btn" href="'+resourceLink(f)+'" download>Tải xuống</a><button type="button" class="resource-trash" data-resource-trash="'+esc(f.source+':'+f.id)+'" aria-label="Chuyển '+esc(f.name)+' vào Thùng rác">'+svgIcon('trash')+'</button></div></div></article>').join(''))+'</div><div class="resource-pagination"><button type="button" class="btn" data-resource-page="-1" '+(!s.offset||s.loading?'disabled':'')+'>← Trước</button><span>'+(!s.total?'0 tệp':(s.offset+1)+'–'+Math.min(s.offset+s.files.length,s.total)+' / '+s.total)+'</span><button type="button" class="btn" data-resource-page="1" '+(s.offset+s.files.length>=s.total||s.loading?'disabled':'')+'>Sau →</button></div>';}
function paintResources(){if(view!=='resources')return;$('#main').innerHTML=resourcesPage();$('#crumb').textContent='Tài nguyên';$('#search').placeholder='Tìm tên tệp…';refreshDueAlerts();}
async function loadResources(force=false){if(!currentUser||view!=='resources')return;const s=resourceState,key=[currentUser.id,query,s.kind,s.scope,s.offset].join('|');if(!force&&s.key===key)return;s.key=key;s.loading=true;s.error='';paintResources();try{const params=new URLSearchParams({q:query,kind:s.kind,scope:s.scope,offset:String(s.offset)}),result=await requestAPI('resources?'+params);if(resourceState!==s||s.key!==key||currentUser?.id!==s.owner||view!=='resources')return;if(s.offset&&result.total<=s.offset){s.offset=Math.max(0,Math.floor((result.total-1)/60)*60);s.key='';return loadResources();}Object.assign(s,result,{loading:false});paintResources();}catch(err){if(resourceState!==s||s.key!==key||currentUser?.id!==s.owner)return;s.loading=false;s.error=err.message;paintResources();}}
let resourceWasActive=false;const renderBeforeResources=render;render=function(){renderBeforeResources();if(view!=='resources'){resourceWasActive=false;return;}if(!resourceWasActive)resourceState.key='';resourceWasActive=true;if(resourceState.owner!==currentUser?.id)resourceState={owner:currentUser?.id,files:[],total:0,used:0,offset:0,kind:'all',scope:'',search:'',key:'',loading:false,error:''};if(resourceState.search!==query){resourceState.offset=0;resourceState.search=query;resourceState.key='';}paintResources();clearTimeout(resourceTimer);resourceTimer=setTimeout(loadResources,200);};
function selectedResource(key){return resourceState.files.find(f=>f.source+':'+f.id===key);}
function resourceDetail(f){const url=resourceLink(f,true),safe=f.source==='r2';let preview='<div class="resource-generic">'+resourceThumbnail({...f,source:'placeholder'})+'<p>Tải xuống để mở bằng ứng dụng phù hợp.</p></div>';if(safe&&f.mime.startsWith('image/')||f.source==='legacy'&&f.kind==='image')preview='<img src="'+url+'" alt="'+esc(f.name)+'">';if(safe&&f.mime.startsWith('video/'))preview='<video controls preload="metadata" src="'+url+'"></video>';if(safe&&f.mime.startsWith('audio/'))preview='<audio controls preload="metadata" src="'+url+'"></audio>';if(/\.pdf$/i.test(f.name))preview='<iframe class="resource-pdf-frame" title="Xem tệp PDF" src="'+url+'" sandbox></iframe>';modal('<h2>'+esc(f.name)+'</h2><div class="resource-preview">'+preview+'</div><dl class="resource-metadata"><dt>Loại</dt><dd>'+esc(RESOURCE_KIND[f.kind]||'Tệp')+' · '+esc(f.mime)+'</dd><dt>Dung lượng</dt><dd>'+formatSize(f.size)+'</dd><dt>Tải lên</dt><dd>'+esc(resourceDate(f.created))+' (Việt Nam)</dd><dt>Nơi lưu</dt><dd>'+esc(resourceSource(f))+'</dd></dl><div class="help-actions"><a class="btn primary" href="'+resourceLink(f)+'" download>'+svgIcon('download')+'Tải xuống</a><button type="button" class="btn danger" data-resource-trash="'+esc(f.source+':'+f.id)+'">'+svgIcon('trash')+'Thùng rác</button></div>',null,true);}
function trashResource(f){modal('<h2>Chuyển tệp vào Thùng rác?</h2><p class="help-copy">'+esc(f.name)+' · '+formatSize(f.size)+'</p><p class="help-copy">Có thể khôi phục trong 30 ngày. Các nơi đang dùng tệp sẽ tạm thời không mở được tệp này.</p>',async()=>{const button=$('#editor-form [type=submit]');button.disabled=true;try{await requestAPI((f.source==='legacy'?'legacy-files/':'assets/')+encodeURIComponent(f.id)+'/trash','POST',{});$('#editor').close();resourceState.key='';resourceState.files=resourceState.files.filter(x=>x!==f);await loadResources(true);notify('Đã chuyển tệp vào Thùng rác.');}catch(err){notify(err.message);}finally{button.disabled=false;}});}
document.addEventListener('change',e=>{if(e.target.id==='resource-kind'||e.target.id==='resource-scope'){resourceState[e.target.id==='resource-kind'?'kind':'scope']=e.target.value;resourceState.offset=0;loadResources();}});
document.addEventListener('click',e=>{const detail=e.target.closest('[data-resource-detail]'),trash=e.target.closest('[data-resource-trash]'),page=e.target.closest('[data-resource-page]');if(detail){const f=selectedResource(detail.dataset.resourceDetail);if(f)resourceDetail(f);}if(trash){const f=selectedResource(trash.dataset.resourceTrash);if(f)trashResource(f);}if(page){resourceState.offset=Math.max(0,resourceState.offset+Number(page.dataset.resourcePage)*60);loadResources();}if(e.target.closest('[data-resources-refresh]')){resourceState.key='';loadResources(true);}});


/* v1.9.5 · Upload directly into existing private R2 resources.
   A file must belong to an existing project or note; no new database entity. */
function openResourceUploader(){
  if(!currentUser||contentReadOnly)return;
  const options=[
    ...(data.projects||[]).map(p=>({value:'project:'+p.id,label:'Dự án · '+p.name+(p.archived?' (Lưu trữ)':'')})),
    ...(data.notes||[]).map(n=>({value:'note:'+n.id,label:'Ghi chú · '+n.title}))
  ];
  if(!options.length){notify('Hãy tạo ít nhất một dự án hoặc ghi chú trước khi tải tệp.');return;}
  const current=resourceState.scope.startsWith('project:')?resourceState.scope:options[0].value;
  const selected=options.some(o=>o.value===current)?current:options[0].value;
  modal('<h2>Tải tệp lên Tài nguyên</h2><p class="help-copy">Lưu vào kho riêng tư và chọn nơi quản lý tệp. Giới hạn 25 MB mỗi tệp; dữ liệu thuộc tài khoản của bạn.</p>'+
   '<label class="field">Lưu trong<select id="resource-upload-scope" aria-label="Chọn nơi lưu tệp">'+options.map(o=>'<option value="'+esc(o.value)+'" '+(o.value===selected?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select></label>'+
   '<label class="field upload-dropzone"><strong>↑ Chọn tệp từ thiết bị</strong><span>Chọn một hoặc nhiều tệp · tối đa 25 MB mỗi tệp</span><input type="file" id="resource-upload-files" multiple aria-label="Chọn tệp cần tải lên"></label><div id="upload-file-summary" aria-live="polite"></div>'+
   '<progress id="resource-upload-progress" value="0" max="100"></progress>'+
   '<p id="resource-upload-status" role="status" aria-live="polite">Chưa chọn tệp.</p>'+
   '<div class="resource-upload-actions"><button type="button" class="btn primary" id="resource-upload-start">↑ Tải lên</button><button type="button" class="btn ghost" id="resource-upload-cancel">Hủy</button></div>',null,true);
  $('#editor').classList.add('resource-upload-dialog');$('#editor').addEventListener('close',()=>$('#editor').classList.remove('resource-upload-dialog'),{once:true});const dialog=$('#editor'),picker=$('#resource-upload-files'),submit=$('#resource-upload-start'),cancel=$('#resource-upload-cancel'),status=$('#resource-upload-status'),bar=$('#resource-upload-progress');
  let uploading=false,cancelled=false,controller=null;
  picker.onchange=()=>{status.textContent=picker.files.length?picker.files.length+' tệp đã chọn · tối đa 25 MB/tệp.':'Chưa chọn tệp.';};
  cancel.onclick=()=>{cancelled=true;controller?.abort();if(!uploading)dialog.close();else{status.textContent='Đang hủy tải…';cancel.disabled=true;}};
  dialog.addEventListener('close',()=>{cancelled=true;controller?.abort();},{once:true});
  submit.onclick=async()=>{
    if(uploading)return;
    const files=Array.from(picker.files),scope=$('#resource-upload-scope')?.value;
    if(!files.length){status.textContent='Vui lòng chọn ít nhất một tệp.';picker.focus();return;}
    if(!options.some(o=>o.value===scope)){status.textContent='Vui lòng chọn nơi lưu hợp lệ.';return;}
    if(files.some(f=>f.size<=0||f.size>25000000)){status.textContent='Mỗi tệp phải lớn hơn 0 và không quá 25 MB.';return;}
    uploading=true;cancelled=false;submit.disabled=true;picker.disabled=true;$('#resource-upload-scope').disabled=true;
    let completed=0;
    try{
      if(dirty){await flushCloud();if(dirty)throw Error('Dữ liệu chưa đồng bộ. Vui lòng thử lại.');}
      for(const [index,file] of files.entries()){
        if(cancelled)throw Error('Đã hủy tải.');
        let id=null;
        try{
          status.textContent='Đang chuẩn bị '+file.name+' ('+(index+1)+'/'+files.length+')…';
          const start=await requestAPI('assets/start','POST',{name:file.name,size:file.size,mime:file.type||'application/octet-stream',scope});
          id=start.id;
          if(!Number.isInteger(start.chunk)||start.chunk<=0)throw Error('Kích thước tải lên không hợp lệ.');
          let part=0;
          for(let offset=0;offset<file.size;offset+=start.chunk){
            if(cancelled)throw Error('Đã hủy tải.');
            controller=new AbortController();
            const response=await fetch('/api/assets/'+encodeURIComponent(id)+'/part?n='+(++part),{
              method:'PUT',credentials:'same-origin',
              headers:{'Content-Type':'application/octet-stream'},
              body:file.slice(offset,offset+start.chunk),signal:controller.signal
            });
            if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw Error(error||'Tải tệp thất bại.');}
            const percent=Math.round(Math.min(offset+start.chunk,file.size)/file.size*100);
            bar.value=percent;status.textContent='Đang tải '+file.name+' ('+(index+1)+'/'+files.length+') · '+percent+'%';
          }
          if(cancelled)throw Error('Đã hủy tải.');
          await requestAPI('assets/'+encodeURIComponent(id)+'/complete','POST',{});
          completed++;
        }catch(error){
          if(id)await requestAPI('assets/'+encodeURIComponent(id)+'/abort','POST',{}).catch(()=>{});
          throw error;
        }finally{controller=null;}
      }
      if(dialog.open)dialog.close();
      resourceState.key='';resourceState.offset=0;
      if(view==='resources')await loadResources(true);
      notify('Đã tải lên '+completed+' tệp vào Tài nguyên.');
    }catch(error){
      if(dialog.open)status.textContent=(completed?'Đã lưu '+completed+' tệp. ':'')+(cancelled?'Đã hủy các tệp còn lại.':error.message);
      if(completed&&view==='resources'){resourceState.key='';loadResources(true);}
    }finally{
      uploading=false;
      if(dialog.open){submit.disabled=false;picker.disabled=false;const select=$('#resource-upload-scope');if(select)select.disabled=false;cancel.disabled=false;}
    }
  };
}
document.addEventListener('click',e=>{if(e.target.closest('[data-resource-upload]'))openResourceUploader();});

document.addEventListener('change',e=>{if(e.target.id!=='resource-upload-files')return;const summary=document.querySelector('#upload-file-summary');if(!summary)return;summary.replaceChildren(...Array.from(e.target.files).map(f=>{const row=document.createElement('p');row.textContent=f.name+' · '+formatSize(f.size)+(f.size>25000000?' · Vượt giới hạn 25 MB':'');return row;}));});
