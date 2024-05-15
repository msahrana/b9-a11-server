const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://job-nest-8cab6.web.app",
    "https://job-nest-8cab6.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
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

/* my own middleware */
const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({massage: "not authorized"});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({massage: "unauthorized"});
    }
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    const jobsCollection = client.db("jobNestDB").collection("jobs");
    const appliedCollection = client.db("jobNestDB").collection("applied");

    /* jwt */
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.cookie("token", token, cookieOptions).send({success: true});
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", {...cookieOptions, maxAge: 0})
        .send({success: true});
    });

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

    app.get("/jobs/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({massage: "forbidden access"});
      }
      const query = {email: email};
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const salary = req.body;
      const updateDoc = {
        $set: salary,
      };
      const result = await jobsCollection.updateOne(query, updateDoc);
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
      const query = {...applied, jobId: applied?.jobId};
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

    /* pagination */
    app.get("/all-jobs", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const search = req.query.search;
      const filter = req.query.filter;
      let query = {
        job_title: {$regex: search, $options: "i"},
      };
      if (filter) query.category = filter;
      const result = await jobsCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/jobs-count", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      let query = {
        job_title: {$regex: search, $options: "i"},
      };
      if (filter) query.category = filter;
      const count = await jobsCollection.countDocuments();
      res.send({count});
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
