const express = require("express");
const { generateSlug } = require("random-word-slugs")
const {ECSClient,RunTaskCommand} = require("@aws-sdk/client-ecs");
const {z} = require("zod")
const {PrismaClient} = require("@prisma/client")
// const { Server} = require("socket.io");
// const Redis = require("ioredis")


const ecsclient = new ECSClient({
    region:'eu-north-1',
    credentials: {
        accessKeyId: '',
        secretAccessKey: '',
    }
});
const config = {
    CLUSTER : process.env.CLUSTER,
    TASK: process.env.TASK
}
const app = express ();
const PORT = 9000;
app.use(express.json())

const prisma = new PrismaClient()

// const subscriber= new Redis('redis-17471.crce179.ap-south-1-1.ec2.redns.redis-cloud.com:17471')
// const io = new Server({cors:'*'});

// io.on('connection',socket=>{
//     socket.on('subscribe',channel =>{
//         socket.join(channel)
//         socket.emit('message',`joined${channel}`)
//     })
// });

// io.listen(9001,()=>{
//     console.log("socket server is running.. at 9001");
    
// });
app.post('/project',async(req,res)=>{
    const schema = z.object({
        name : String(),
        gitURL: String()
    });
    const safeParseResult = schema.safeParse();
    if(safeParseResult.error) return req.status(400).json({error : safeParseResult.error});
    const {name,gitURL} = safeParseResult.data;

    const deployment = await prisma.project.create({
        data:{
            name,
            gitURL,
            subDomain:generateSlug()
        }
    })
    return res.json({status:'success',data:{project}})

})
app.post('/deploy',async(req,res)=>{
    const {gitURL,slug} = req.body;
    const projectslug = generateSlug();
    // container spining
    const command = new  RunTaskCommand({
        cluster:config.CLUSTER,
        taskDefinition: config.TASK,
        launchType:"FARGATE",
        count:1,
        networkConfiguration:{
            awsvpcConfiguration:{
                subnets:['subnet-053cd31ed55084461','subnet-00570a7891cd2a0f7','subnet-06c73674c09a6c9a8'],
                securityGroups:['sg-026b9793590eb4019'],
                assignPublicIp:'ENABLED'
            }
            
        },
        overrides:{
                containerOverrides:[
                    {
                        name:'builder-image',
                        environment:[
                            {name: 'GIT_REPOSIROTY_URL',value:gitURL},
                            {name:'PROJECT_ID',value:projectslug}
                        ]
                    }
                ]
        }
    });
    await ecsclient.send(command);

    return res.json({status:'queued',data:{
        url: `http://${projectslug}.localhost:8000`,
        projectslug
    }});

});

// async function initRedisSubscriber(){
//     subscriber.psubscribe('log:*')
//     subscriber.on('pmessage',(pattern,channel,message)=>{
//         io.to(channel).emit('message',message)
//     })
// };
// initRedisSubscriber()

app.listen(PORT,()=>{
    console.log(`api-server is running at ${PORT}`);
    
})