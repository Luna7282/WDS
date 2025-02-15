const path = require("path")
const {exec} = require("child_process")
const { log, error } = require("console")
const fs = require("fs")
const {S3Client,PutObjectCommand} = require("@aws-sdk/client-s3")

// const Redis = require("ioredis")


// const publisher = new Redis('redis-17471.crce179.ap-south-1-1.ec2.redns.redis-cloud.com:17471')

const mime = require('mime-types')
const s3Client = new S3Client({
    region:'eu-north-1',
    credentials: {
        accessKeyId: process.env.accessKeyId,
        secretAccessKey: process.env.secretAccessKey,
    }
})
const PROJECT_ID = process.env.PROJECT_ID;



function publishlog(log){
    // publisher.publish(`logs:${PROJECT_ID}`,JSON.stringify({log}))
};


async function init (){
    console.log("Executing....")
    // publishlog("Build started...")
    const outputpath = path.join(__dirname,'output')

    const p = exec(`cd ${outputpath} && npm install && npm run build`)

    p.stdout.on('data',function(data){
        console.log(data.toString());
        // publishlog(data.toString())
        
    })
    p.stdout.on('error',function(data){
        console.log("Error",data.toString());
        // publishlog(`error ${ publishlog(data.toString())}`)
    })
    p.on('close',async ()=>{
        console.log("build completed");
        // publishlog("Build complete...")
        const distFolderPath = path.join(__dirname,'output','dist');
        const distFolderContents = fs.readdirSync(distFolderPath,{recursive:true})
        // publishlog("starting to upload....")
        for(const file of distFolderContents){
            const filepath = path.join(distFolderPath, file);
                if(fs.lstatSync(filepath).isDirectory())continue;
                console.log("uploading....",filepath);
                // publishlog(" uploading ....",filepath)
                
                // upload on s3
                const command = new PutObjectCommand({
                    Bucket:'wdsfordeployment',
                    Key:`__outputs/${PROJECT_ID}/${file}`,
                    Body:fs.createReadStream(filepath),
                    ContentType: mime.lookup(filepath)
                });
               await s3Client.send(command);
               console.log("uploaded....",filepath)
            //    publishlog(`uploaded .. ${file}`)

        };
        console.log("File uploading completed")
        // publishlog("Done...")
        
        
    })
}
init()