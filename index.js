const express = require("express");
const app = express();
app.use(express.json());
const Datastore = require('nedb');
const joi = require("@hapi/joi");

// Load database form file.
// You can specify the filename at run time: `npm start mydb.db`
// default is contacts.db
const DB_FILE = process.argv[2] ? process.argv[2] : 'contacts.db';
console.log(`DB_FILE is ${DB_FILE}`);
const contacts = new Datastore({ filename: DB_FILE, autoload: true, onload: dbOnload });

//
// Start our server
//
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}..`));


//
// REST Endpoints
//

// Default route
app.get("/", (req, res) => {
    res.send("SingleStone REST assesment. Please use a known endpoint.");
});

// Get all contacts
app.get("/contacts", (req, res) => {
    contacts.find({}, (err, docs) => {
        if (err) {
            res.status(400).send({ error: err });
            return;
        }

        res.send(docs);
    });
});

// Get contact by id
app.get("/contacts/:id", (req, res) => {
    contacts.find({ "_id": req.params.id }, (err, docs) => {
        if (err) {
            res.status(400).send({ error: err });
            return;
        }
        if (docs.length < 1) {
            res.status(400).send({ error: "id not found" });
            return;
        }

        res.send(docs[0]);
    });
});

// Create a new contact
app.post("/contacts", (req, res) => {
    const { error } = validateContact(req.body);
    if (error) {
        res.status(400).send({ error: error });
        return;
    }

    const contact = req.body;
    // Should eliminate duplicates by using unique identifiers (i.e. email)
    contacts.insert(contact, (err, doc) => {
        if (err) {
            res.status(400).send({ error: err });
            return;
        }

        res.send(doc._id);
    });
});

// Update contact by id
app.put("/contacts/:id", (req, res) => {
    const { error } = validateContact(req.body);
    if (error) {
        res.status(400).send({ error: error });
        return;
    }

    contacts.update({ _id: req.params.id }, req.body, {}, function (err, linesAffected) {
        if (err) {
            res.status(400).send({ error: err });
            return;
        }
        if (linesAffected < 1) {
            res.status(400).send({ error: "id not found" });
            return;
        }

        res.send('success');
    });
});

// Delete contact by id
app.delete("/contacts/:id", (req, res) => {
    contacts.remove({ _id: req.params.id }, {}, (err, linesAffected) => {
        if (err) {
            res.status(400).send({ error: err });
            return;
        }
        if (linesAffected < 1) {
            res.status(400).send({ error: "id not found" });
            return;
        }

        res.send('success');
    });
});

//
// End endpoints
// 

// Validate our incoming data.
// Note: In general, if I expected this app to scale I would have used an ODM to enforce scema.
// For purposes of an exercise, we will validate our incoming data and hope all is good on output.
function validateContact(contact) {
    const schema = joi.object({
        name: {
            first: joi.string(),
            middle: joi.string(),
            last: joi.string(),
        },
        address: {
            street: joi.string(),
            city: joi.string(),
            state: joi.string(),
            zip: joi.string()
        },
        phone: joi.array().items(
            joi.object(
                {
                    number: joi.string(),
                    type: joi.string().pattern(/home|work|mobile/, 'Phone Type')
                }
            )
        ),
        email: joi.string().required()
    });
    return schema.validate(contact);
}

// Check for database load status
function dbOnload(err) {
    if (err) {
        console.log(`DB_FILE ${DB_FILE} error: ${err}`);
    } else {
        console.log(`DB_FILE ${DB_FILE} loaded successfully.`);
    }
}