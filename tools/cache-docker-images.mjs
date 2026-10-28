// Download official Docker Hub linux/amd64 images without requiring a local daemon.
// Verify every content digest before producing a Docker-load archive for the NAS.
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve('outputs/docker-cache'); fs.mkdirSync(root,{recursive:true});
const manifests=[];
const nodeOnly=process.argv.includes('--node-only');
for(const [name,tag] of (nodeOnly?[['node','24-bookworm-slim']]:[['rust','1-bookworm'],['node','24-bookworm-slim']])) {
  const repository=`library/${name}`;
  const token=await (await fetch(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull`)).json();
  const headers={Authorization:`Bearer ${token.token}`,Accept:'application/vnd.oci.image.index.v1+json,application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json'};
  const get=async(p)=>{const r=await fetch(`https://registry-1.docker.io/v2/${repository}/${p}`,{headers,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`Registry ${r.status}`);return r;};
  let manifest=await (await get(`manifests/${tag}`)).json();
  if(manifest.manifests){const target=manifest.manifests.find(m=>m.platform.os==='linux'&&m.platform.architecture==='amd64');if(!target)throw Error('No amd64 image');manifest=await (await get(`manifests/${target.digest}`)).json();}
  async function blob(digest) {
    const file=path.join(root,digest.replace(':','-'));
    if(!fs.existsSync(file)) {
      console.log(`Downloading ${name} ${digest.slice(0,20)}`);
      const response=await get(`blobs/${digest}`);
      await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(file+'.partial'));
      fs.renameSync(file+'.partial',file);
    }
    const hash=createHash('sha256');for await(const bytes of fs.createReadStream(file))hash.update(bytes);
    if('sha256:'+hash.digest('hex')!==digest)throw Error('Image digest mismatch');
    return file;
  }
  const configSource=await blob(manifest.config.digest),config=manifest.config.digest.slice(7)+'.json';fs.copyFileSync(configSource,path.join(root,config));
  const layers=[];
  for(const layer of manifest.layers) {
    const compressed=await blob(layer.digest),relative=layer.digest.slice(7)+'/layer.tar',dest=path.join(root,relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    if(!fs.existsSync(dest)) {await pipeline(fs.createReadStream(compressed),createGunzip(),fs.createWriteStream(dest+'.partial'));fs.renameSync(dest+'.partial',dest);}
    layers.push(relative);
  }
  manifests.push({Config:config,RepoTags:[`${name}:${tag}`],Layers:layers});
  console.log(`Verified ${name}:${tag}`);
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifests));
const archive=path.resolve(nodeOnly?'outputs/node-base-image.tar':'outputs/note4-base-images.tar');
const files=['manifest.json',...manifests.flatMap(m=>[m.Config,...m.Layers])];
const result=spawnSync('tar',['-cf',archive,'-C',root,...new Set(files)],{stdio:'inherit'});
if(result.status!==0)throw Error('Archive creation failed');
console.log(archive);
