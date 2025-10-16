import { PrismaClient } from '../generated/prisma/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono'
import { verify } from 'hono/jwt';
import {createAlertInput,Role,updateAlertInput} from "@anshpujara/crowd-management_common"

type Role = 'student' | 'security' | 'driver';

export const Alert = new Hono<{
    Bindings:{
        DATABASE_URL:string
        DIRECT_URL:string
        JWT_SECRET:string
    },
    Variables:{
        userId:string,
        role?:Role,
        name:string
    }
}>();

function isRole(x: unknown): x is Role {
  return x === 'student' || x === 'security' || x === 'driver';
}

Alert.use(async(c,next)=>{
    const jwt = c.req.header("Authorization");

    if(!jwt){
        c.status(401);
        return c.text("un Authorization")
    }

    const token = jwt.split(" ")[1];
    try{    
        const payload = await verify(token,c.env.JWT_SECRET);

        if(!payload){
            c.status(401);
            return c.text("unAuthorization")
        }

        c.set('userId',String(payload.id));
        c.set('name',typeof (payload as any).name === 'string' ? (payload as any).name : 'Anonymous');
        const rawRole = (payload as any)?.role;
        if(isRole(rawRole)){
            c.set('role',rawRole);
        }
        else{
            c.status(401);
            return c.text("unAuthorization")
        }
        await next();
    }catch(e){
        c.status(401);
        return c.text("unAuthorization")
    }
})

Alert.post('/create',async(c)=>{
    console.log("Create Entered");
    const body=await c.req.json();

    const {success} = createAlertInput.safeParse(body);

    if(!success){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }
    // console.log("hey")
    try{
        const role = c.get('role');
        const id = c.get('userId');
        const name = c.get('name') ?? 'Anonymous';
        console.log(name)
        if(!role){
            return c.json({error:"error in role"})
        }
        const prisma = new PrismaClient({
            datasourceUrl:c.env.DATABASE_URL
        }).$extends(withAccelerate())
        const alert =await prisma.alert.create({
            data:{
                type:role,
                title:body.title,
                message:body.message,
                createdById:id,
                createdByName:name,
                callTo:body.callTo
            }
        });

        return c.json({
            id:alert.id
        })
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({error:"error"});
    }
})

Alert.put('/alerts/:id/resolve',async(c)=>{
    // const body = await c.req.json();
    const id = c.req.param('id');

    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const alertResolved = await prisma.alert.update({
        where:{
            id:id
        },
        data:{
            status:"resolved"
        }
    }) 
    return c.text("Resolve Entered");
})

Alert.put('/alerts/update',async(c)=>{
    const body = await c.req.json();

    const {success} = updateAlertInput.safeParse(body);

    if(!success){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }

    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const alertUpdated = await prisma.alert.update({
        where:{
            id:body.id
        },
        data:{
            message:body.message
        }
    })
    return c.text("Update Entered")
})

Alert.get('/alerts',async(c)=>{
    console.log("alerts entered");
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());
    // console.log(c.env.DATABASE_URL);
    try{
        const alert = await prisma.alert.findMany({
            orderBy:[
                {status: "asc"}, 
                {createdAt: "desc" },
            ]
        });
        return c.json(alert);
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({error:"Error"});
    }
})

Alert.get('/forYou',async(c)=>{
    console.log("alerts entered");
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());
    const role = (c.get("role") as string | undefined)?.toLowerCase() || "student";
    // console.log(c.env.DATABASE_URL);
    try{
        const alert = await prisma.alert.findMany({
            where: {
                OR: [
                    { callTo: { has: role as any } },
                    { callTo: { isEmpty: true } },
                    { callTo: { equals: null } },
                ],
            },
            orderBy:[
                {status: "asc"}
            ]
        });
        return c.json(alert);
    }catch(e){
        console.log(e);
        c.status(403);
        return c.json({error:"Error"});
    }
})

Alert.get('/MyAlerts',async(c)=>{
    const userId = c.get('userId');
    console.log(userId);
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const LatestAlert = await prisma.alert.findMany({
        where:{
            createdById:userId
        },
        orderBy: [
            { status: "asc" }, 
            { createdAt: "desc" },
        ]
    })
    console.log(LatestAlert);
    return c.json({LatestAlert});
})

Alert.get('/alerts/latest',async(c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const LatestAlert = await prisma.alert.findMany({
        where:{
            status:"active"
        },
        orderBy:{
            createdAt:"desc"
        }
    })
    return c.json({LatestAlert});
})

Alert.get('/alerts/:id',async(c)=>{
    console.log("alerts/id entered")
    // const body = await c.req.json();
    const id = c.req.param('id');
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const UniqueAlert = await prisma.alert.findUnique({
        where:{
            id
        }
    });
    return c.json({UniqueAlert});
})
