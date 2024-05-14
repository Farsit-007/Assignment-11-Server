const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const crosOption = {
  origin: ['http://localhost:5173',
    'https://assignment-11-5a8b0.web.app',
    'https://assignment-11-5a8b0.firebaseapp.com'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(crosOption))
app.use(express.json())
app.use(cookieParser())

//MiddleWare
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err)
        return res.status(401).send({ message: 'unauthorized access' })
      }
      console.log(decoded)
      req.user = decoded
      next()
    })
  }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xs1g9z6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const RoomsCollection = client.db('Roomsdb').collection('Rooms');
    const BookingCollection = client.db('Roomsdb').collection('Bookings');
    const ReviewCollection = client.db('Roomsdb').collection('Review');
    const NewsLetterCollection = client.db('Roomsdb').collection('Newsletter');


    // jwt generate
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // Clear token on logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true })
    })
    
 //Filter and Fetch
    app.get('/featured-room', async (req, res) => {

      const { minPrice, maxPrice } = req.query;
      const filter = {};

      if (minPrice && maxPrice) {
        filter.price_per_night = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice)
        };
      }
      else if (minPrice) {
        filter.price_per_night = { $gte: parseFloat(minPrice) };
      }
      else if (maxPrice) {
        filter.price_per_night = { $lte: parseFloat(maxPrice) };
      }
      const result = await RoomsCollection.find(filter).toArray();
      res.send(result);
    });

    //Single Room Details 
    app.get('/featured-room/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await RoomsCollection.findOne(query)
      res.send(result);
    })

    //Add to My Bookings
    app.post('/booking', async (req, res) => {
      const room = req.body;
      const query = {
        email: room.email,
        roomId: room.roomId
      }
      const alreadExist = await BookingCollection.findOne(query)
      if (alreadExist) {
        return res.status(400).send("Already Booked")
      }
      const result = await BookingCollection.insertOne(room);
      res.send(result)
    })

    //Update the Availability
    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const availability = req.body;
      const query = { _id: new ObjectId(id) }
      const updatedoc = {
        $set: { ...availability },
      }
      const result = await RoomsCollection.updateOne(query, updatedoc)
      res.send(result)
    })

    //Update the Availability
    app.patch('/bookingupdate/:id', async (req, res) => {
      const id = req.params.id;
      const availability = req.body;
      const query = { _id: new ObjectId(id) }
      const updatedoc = {
        $set: { ...availability },
      }
      const result = await RoomsCollection.updateOne(query, updatedoc)
      res.send(result)
    })

    //Fetching Booking by User 
    app.get('/booking/:email', verifyToken, async (req, res) => {
      const tokenemail = req.user?.email;
      const email = req.params.email;
      if (tokenemail !== email) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      const query = { email: email };
      const result = await BookingCollection.find(query).toArray();
      res.send(result)
    })

    //Update Booking Date
    app.patch('/updatebooking/:id', async (req, res) => {
      const id = req.params.id;
      const reDate = req.body;
      const query = { _id: new ObjectId(id) }
      const updatedoc = {
        $set: { ...reDate },
      }
      const result = await BookingCollection.updateOne(query, updatedoc)
      res.send(result)
    })
    // Cancel Booking 
    app.delete('/bookingDelete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const booking = await BookingCollection.findOne(query);
      const bookedDate = new Date(booking.reDate);
      const cancellationDeadline = new Date(bookedDate);
      cancellationDeadline.setDate(bookedDate.getDate() - 1);

      const currentDate = new Date();
      if (currentDate <= cancellationDeadline) {
        const result = await BookingCollection.deleteOne(query);
        res.send(result);
      } else {
        res.status(400).send("Cancellation deadline has passed");
      }

    })

    //Add to My Review
    app.post('/review', async (req, res) => {
      const room = req.body;
      room.createdAt = new Date()
      const query = {
        email: room.email,
        roomId: room.roomId
      }
      const alreadExist = await ReviewCollection.findOne(query)
      if (alreadExist) {
        return res.status(400).send("Already Reviewed")
      }
      const result = await ReviewCollection.insertOne(room);

      const updateDoc = {
        $inc: { Review_Count: 1 },
      }
      const ReviewQuery = { _id: new ObjectId(room.roomId) }
      const updateReviewCount = await RoomsCollection.updateOne(ReviewQuery, updateDoc)
      console.log(updateReviewCount)
      res.send(result)
    })

    //Fetch the review
    app.get('/allreview', async (req, res) => {
      const result = await ReviewCollection.find().sort({ createdAt: -1 }).toArray()
      res.send(result);
    })

    //NewsLetter Posting
    app.post('/newsletter', async (req, res) => {
      const room = req.body;
      const result = await NewsLetterCollection.insertOne(room);
      res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server Runnings');
})

app.listen(port, () => {
  console.log(`Server Runnings Port ${port}`);
})