const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j10pchd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("eduManage");
    const usersCollection = database.collection("users");
    const classesCollection = database.collection("classes");
    const teachersRequestCollection = database.collection("requests");
    const paymentsCollection = database.collection("payments");
    const assignmentsDataCollection = database.collection("assignment");

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const user = req.decoded;
      console.log(user);
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      console.log(result)
      if (result && result?.role === "admin") {
        //  res.send({ message: "authorized access !" });
         next();
      }else{
        res.status(401).send({ message: "unauthorized access !" });
      }
        

      
    };

    //verify host
    const verifyStudent = async (req, res, next) => {
      const user = req.decoded;
      console.log(user);
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      console.log(result)
      if (result && result?.role === "student") {
        //  res.send({ message: "authorized access !" });
         next();
      }else{
        res.status(401).send({ message: "unauthorized access !" });
      }
        

      
    };


    //verify teacher
    const verifyTeacher = async (req, res, next) => {
      const user = req.decoded;
      console.log(user);
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      console.log(result)
      if (result && result?.role === "teacher") {
        //  res.send({ message: "authorized access !" });
         next();
      }else{
        res.status(401).send({ message: "unauthorized access !" });
      }
        

      
    };
    
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Middleware to verify JWT
    const verifyToken = (req, res, next) => {
      console.log("Inside verifyToken", req.headers);

      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res
          .status(401)
          .send({ message: "No authorization header provided" });
      }

      const token = authHeader.split(" ")[1]; // Assuming 'Bearer <token>'

      if (!token) {
        return res
          .status(401)
          .send({ message: "Invalid authorization format" });
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Token verification failed" });
        }
        req.decoded = decoded;
        next();
      });
    };


  
    //user put
    app.put("/user", async (req, res) => {
      const user = req.body;

      const isExist = await usersCollection.findOne({ email: user?.email });
      if (isExist) return res.send(isExist);

      const option = { upsert: true };
      const query = { email: user?.email };
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    //payment server
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      const priceInCent = parseInt(price) * 100;

      if (!price || priceInCent < 1) return;

      const { client_secret } = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: "usd",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.send({ clientSecret: client_secret });
    });

    //Approved and change user role and status
    app.patch("/user/update/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      console.log(email);
      console.log(query);
      const updateDoc = {
        $set: {
          ...user,
        },
      };
      console.log(updateDoc);
      const result = await teachersRequestCollection.updateOne(
        query,
        updateDoc
      );
      const result2 = await usersCollection.updateOne(query, updateDoc);
      res.send({ result, result2 });
    });

    //rejected and change user role and status
    app.patch("/user/reject/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      console.log(email);
      console.log(query);
      const updateDoc = {
        $set: {
          ...user,
        },
      };
      console.log(updateDoc);
      const result = await teachersRequestCollection.updateOne(
        query,
        updateDoc
      );
      const result2 = await usersCollection.updateOne(query, updateDoc);
      res.send({ result, result2 });
    });

    //user-all-admin status change
    app.patch("/user-all-admin/update/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      console.log(user);
      const updateDoc = {
        $set: {
          ...user,
        },
      };
      console.log(updateDoc);
      const result = await classesCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //get a user info by email
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    //get all users from db
    app.get("/users", verifyToken,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //get for all classes route
    app.get("/all-classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    //get a class data by id
    app.get("/single-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });

    //single data get from see details
    app.get("/single-data/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });

    //data assignment from enrollment page
    app.get("/assignment-data/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { SeeDetailsId: id };
      const result = await assignmentsDataCollection.findOne(query);
      res.send(result);
    });

    //enroll data get for enroll page
    app.get("/my-enroll/:email",verifyToken,verifyStudent, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const result = await paymentsCollection
        .find({ paymentUserEmail: email })
        .toArray();
      res.send(result);
    });

    //classes insert
    app.post("/class", verifyToken,verifyTeacher, async(req, res) => {
      const classData = req.body;
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    });

    //assignment data post
    app.post("/assignment", async (req, res) => {
      const classData = req.body;
      const result = await assignmentsDataCollection.insertOne(classData);
      res.send(result);
    });

    //payment collection
    app.post("/payment", async (req, res) => {
      const paymentData = req.body;
      const result = await paymentsCollection.insertOne(paymentData);

      const classId = paymentData.classId;
      const query = { _id: new ObjectId(classId) };
      const updateDoc = {
        $inc: { total_enrolment: 1 },
      };
      const updatePayment = await classesCollection.updateOne(query, updateDoc);
      console.log(updatePayment);
      res.send({ result, updatePayment });
    });

    //my-class data get
    app.get("/my-class/:email",verifyToken,verifyTeacher, async (req, res) => {
      const email = req.params.email;
      const result = await classesCollection.find({ email }).toArray();
      res.send(result);
    });



    //my-class for class update
    app.get("/update-class/:id",verifyToken,verifyTeacher, async (req, res) => {
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await classesCollection.findOne(query)
      res.send(result);
    });


    //update data 
    app.patch('/dataUpdate/:id', async(req,res) =>{
      const item = req.body;
      console.log(item)
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set : {
          name : item.name,
          title : item.title,
          description : item.description,
          price : item.price,
          photo : item.photo,
        }
      }
      const result = await classesCollection.updateOne(filter,updateDoc)
      res.send(result)
    })




    //get all class data for home best course
    app.get("/best-course", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    //all-class admin data gate
    app.get("/admin-all-class", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    //teacher request
    app.post("/teach", async (req, res) => {
      const classData = req.body;
      const result = await teachersRequestCollection.insertOne(classData);
      res.send(result);
    });


    //delete
    app.delete('/class-delete/:id',verifyToken,verifyTeacher,async (req,res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await classesCollection.deleteOne(query)
      res.send(result);
    })

    //get for teacher request page
    app.get("/all-teacher-req", async (req, res) => {
      const result = await teachersRequestCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("edu management is running");
});

app.listen(port, () => {
  console.log(`edu management is running ${port}`);
});
