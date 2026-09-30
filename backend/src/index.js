import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import Task from "./model/task.model.js";
import cors from "cors";

dotenv.config();
const port = process.env.PORT;
const app = express();

app.use(express.json());

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
        
    );
//create 
app.post("/api/task", async(req, res) => {
   try {
    const {title, content } = req.body;

    if (!title || !content)
        return res.status(400).json({sucess: false, error: "title and content must be provided."})

    const task = new Task({title, content})

    await task.save();

    res.status(201).json({sucess: true, task});

   } catch (error) 
   {console.log("error in creating task", error);
    res.status(500).json({sucess: false, error: error})    
   }
   
});

app.get("/api/task", async (req, res) => {
    try {
        const task = await Task.find().sort({createdAt: -1})
        res.status(200).json({sucess:true, task})   
     } catch (error) {
        console.log("error in fetching task", error);
    res.status(500).json({sucess: false, error: error})
        
    }

});

app.delete("/api/task/:id", async(req, res) => {
    try {
    const{id} = req.params;
    await Task.findByIdAndDelete(id)
    res.status(200).json({message: "Task has been Deleted"})
        
    } catch (error) {
        console.log("error in fetching task", error);
    res.status(500).json({sucess: false, error: error})
    }
} )

//update
app.put("/api/task/:id", async (req, res)=>{
    try {
        const {id} = req.params;
        const {title, content} = req.body;

        if(!title || !content)
            return req.status(400).json({
        error: "All fields are required.",
    });

    const task = await Task.findById(id);

    if(!task)
        return res.status(404).json({
    error: "task not found",
});

const updatedTask = await Task.findByIdAndUpdate(id, {title, content}) 

    res.status(200).json({
        sucess: true,
        updatedTask,
    });
        
    } catch (error) {
        console.log("Error in updating a task.", error);
        res.status(500).json({
            sucess: false, error: error  });
    }

});

app.get("/api/task/:id", async(req, res) => {
    try {
       const {id} =req.params;
       const task = await Task.findById(id);
       
       if(!task) return res.status(404).json({error: "task not found"});

       res.status(200).json(task);
    } catch (error) {
        console.log("error in getting task", error);
        res.status(500).json({sucess: false, error: error});
    }
});


app.listen(5003, () => {
    console.log("Server is running on PORT 5003")
    connectDB();
})

