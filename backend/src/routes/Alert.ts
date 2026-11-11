import { Hono } from 'hono'
import {createAlertInput,updateAlertInput} from "@anshpujara/crowd-management_common"
import { withPrisma } from "../db/prisma";
import { AppEnv, requireAuth } from '../auth';

export const Alert = new Hono<AppEnv>();

Alert.use(requireAuth)
Alert.use(withPrisma)

Alert.post('/create',async(c)=>{
    const body=await c.req.json();

    const {success} = createAlertInput.safeParse(body);

    if(!success){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }
    try{
        const role = c.get('role');
        const id = c.get('userId');
        const name = c.get('name') ?? 'Anonymous';
        if(!role){
            return c.json({error:"error in role"})
        }
        const alert =await c.var.prisma.alert.create({
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
        c.status(403);
        return c.json({error:"error"});
    }
})

// Only the alert's creator may resolve or edit it; other users get 404 so ids can't be probed.
Alert.put('/alerts/:id/resolve',async(c)=>{
    const id = c.req.param('id');

    const alertResolved = await c.var.prisma.alert.updateMany({
        where:{
            id:id,
            createdById:c.get('userId')
        },
        data:{
            status:"resolved"
        }
    })
    if(alertResolved.count===0){
        c.status(404);
        return c.json({error:"Alert not found"});
    }
    return c.text("Resolve Entered");
})

Alert.put('/alerts/update',async(c)=>{
    const body = await c.req.json();

    const {success} = updateAlertInput.safeParse(body);

    if(!success || typeof body.id !== 'string'){
        c.status(400);
        return c.json({error:"Invalid inputs"});
    }

    const alertUpdated = await c.var.prisma.alert.updateMany({
        where:{
            id:body.id,
            createdById:c.get('userId')
        },
        data:{
            message:body.message
        }
    })
    if(alertUpdated.count===0){
        c.status(404);
        return c.json({error:"Alert not found"});
    }
    return c.text("Update Entered")
})

Alert.get('/alerts',async(c)=>{
    try{
        const alert = await c.var.prisma.alert.findMany({
            orderBy:[
                {status: "asc"}, 
                {createdAt: "desc" },
            ]
        });
        return c.json(alert);
    }catch(e){
        c.status(403);
        return c.json({error:"Error"});
    }
})

Alert.get('/forYou',async(c)=>{
    const role = (c.get("role") as string | undefined)?.toLowerCase() || "student";
    try{
        const alert = await c.var.prisma.alert.findMany({
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
        c.status(403);
        return c.json({error:"Error"});
    }
})

Alert.get('/MyAlerts',async(c)=>{
    const userId = c.get('userId');

    const LatestAlert = await c.var.prisma.alert.findMany({
        where:{
            createdById:userId
        },
        orderBy: [
            { status: "asc" }, 
            { createdAt: "desc" },
        ]
    })
    return c.json({LatestAlert});
})

Alert.get('/alerts/latest',async(c)=>{

    const LatestAlert = await c.var.prisma.alert.findMany({
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
    const id = c.req.param('id');

    const UniqueAlert = await c.var.prisma.alert.findUnique({
        where:{
            id
        }
    });
    return c.json({UniqueAlert});
})
