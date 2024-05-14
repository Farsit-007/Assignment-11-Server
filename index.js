const express = require('express')
const cors = require('cors')
require('dotenv').config()
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



const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
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
      console.log(result);
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