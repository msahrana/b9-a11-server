const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crgl3kb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const jobsCollection = client.db("jobNestDB").collection("jobs");
    const appliedCollection = client.db("jobNestDB").collection("applied");

    /* jobs api */
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    /* applied api */
    app.post("/applied", async (req, res) => {
      const applied = req.body;
      const query = {email: applied?.email, jobId: applied?.jobId};
      const result = await appliedCollection.insertOne(query);
      const updateDoc = {
        $inc: {applicantNumber: 1},
      };
      const jobQuery = {_id: new ObjectId(applied?.jobId)};
      const updateBidCount = await jobsCollection.updateOne(
        jobQuery,
        updateDoc
      );
      console.log(updateBidCount);
      res.send(result);
    });

    app.get("/applied/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await appliedCollection.find(query).toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("JobNest server is running");
});

app.listen(port, () => {
  console.log(`JobNest server is running on port: ${port}`);
});
