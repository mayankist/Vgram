var express 				= require("express"),
	app 					= express(),
	bodyParser 				= require("body-parser"),
	mongoose 				= require("mongoose"),
	passport 				= require("passport"),
	methodOverride 			= require("method-override"),
	Vgram 					= require("./models/vgram"),
	User					= require("./models/user"),
	Comment 				= require("./models/comment"),
	LocalStrategy 			= require("passport-local"),
	passportLocalMongoose 	= require("passport-local-mongoose");

var url = process.env.DATABASEURL || "mongodb://localhost/arpit1";
mongoose.connect(url);

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.locals.moment = require('moment');
app.use(require("express-session")({
	secret: "arpit ki website",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	next();
});


//=============
//ROUTES
//=============

// app.get("/",function(req, res){
// 	res.render("vgram");
// });

app.get("/",function(req, res){
	res.redirect("vgram");
});

app.get("/vgram",function(req, res){
	if(req.query.sortBy && req.query.sortBy==="oldest"){
		Vgram.find({},function(err, all){
			if(err){
				console.log(err);
			} else {
				val = false;
				res.render("vgram",{vgram:all,val:val});
			}
		});
	}else if(req.query.sortBy && req.query.sortBy==="latest"){
		Vgram.find({}).sort({createdAt:-1}).exec(function(err, all){
			if(err){
				console.log(err);
			} else {
				val = true;
				res.render("vgram",{vgram:all,val:val});
			}
		});
	}else if(req.query.sortBy && req.query.sortBy==="mostreviewed"){
		Vgram.find({}).sort({rateCount:-1}).exec(function(err, all){
			if(err){
				console.log(err);
			} else {
				val = true;
				res.render("vgram",{vgram:all,val:val});
			}
		});
	}else{
		Vgram.find({}).sort({createdAt:-1}).exec(function(err, all){
			if(err){
				console.log(err);
			} else {
				val = true;
				res.render("vgram",{vgram:all,val:val});
			}
		});
	}
});

app.post("/vgram", function(req, res){
	Vgram.create(req.body.data, function(err, newlyCreated){
		if(err){
			console.log(err);
		} else {
			newlyCreated.author.id = req.user._id;
      		newlyCreated.author.username = req.user.username;
      		newlyCreated.save();
			res.redirect("/vgram"); 
		}
	});
});

app.get("/vgram/:id", function(req, res){
	Vgram.findById(req.params.id).populate("comments likes").exec(function(err, foundRoom){
		if(err || !foundRoom){
            console.log(err);
            res.redirect('/vgram');
        }else{
			res.render("show", {vgram: foundRoom});
		}
	});
});

// Vgram Like Route
app.post("/vgram/:id/like",isLoggedIn, function (req, res) {
    Vgram.findById(req.params.id, function (err, foundShop) {
        if (err) {
            console.log(err);
            return res.redirect("/vgram");
        }

        // check if req.user._id exists in foundShop.likes
        var foundUserLike = foundShop.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundShop.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundShop.likes.push(req.user);
        }
        foundShop.rateCount = foundShop.likes.length;
        foundShop.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/vgram");
            }
            return res.redirect("back");
        });
    });
});

app.get("/vgram/:id/edit",function(req, res){
	Vgram.findById(req.params.id, function(err, foundRoom){
		if(err){
			res.redirect("/vgram");
		}else{
			res.render("edit", {vgram: foundRoom});
		}
	});
});

app.put("/vgram/:id",function(req, res){
	Vgram.findByIdAndUpdate(req.params.id, req.body.vgram, function(err, updatedShop){
		if(err){
			console.log(err);
			res.redirect("/vgram");
		}else{
			res.redirect("/vgram/" + req.params.id);
		}
	});
});

app.delete("/vgram/:id",function(req, res){
	Vgram.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			res.redirect("/vgram");
		}else{
			res.redirect("/vgram");
		}
	});
});

// ====================

//Comments New
app.get("/vgram/:id/comments/",isLoggedIn, function(req, res){
	//find shop by id
	Vgram.findById(req.params.id, function(err, shop){
		if(err){
			console.log(err);
		}else{
			res.render("comments/vgram", {vgram: shop});
		}
	});
});

//Comments Create
app.post("/vgram/:id/comments/",isLoggedIn, function(req, res){
	//lookup shop using id
	Vgram.findById(req.params.id, function(err, shop) {
        if (err) {
          	console.log(err);
          	res.redirect("/vgram");
        } else {
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					console.log(err);
				}else{
					//add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					//save comment
					comment.save();
					shop.comments.push(comment);
					shop.save();
					res.redirect('/vgram/' + shop._id);
				}
			});
		}
	});	
});

// Comment Destroy Route
app.delete("/vgram/:id/comments/:comment_id", function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err){
		if(err){
			res.redirect("back");
		} else{
			Vgram.findByIdAndUpdate(
      		  req.params.id,
      		  { $pull: { comments: { $in: [req.params.comment_id] } } },
      		  function(err) {
      		    if (err) {
      		      console.log(err);
      		    }
      		  }
      		);
			res.redirect("/vgram/" + req.params.id);
		}
	});
});

// ====================

app.get("/user", function(req, res){
	res.render("user");
});

app.get("/profile",isLoggedIn, function(req, res){
	res.render("profile");
});

//handling user sign
app.post("/register", function(req, res){
	var newUser = new User({
      username: req.body.username,
      name: req.body.name,
      bio: req.body.bio
    });
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			console.log(err);
			return res.render('user');
		}
		passport.authenticate("local")(req, res, function(){
			res.redirect("/profile");
		});
	});
});

app.get("/login", function(req, res){
	if (req.user) {
    	return res.redirect("/vgram");
  	} else {
    	res.render("user");
  	}
});

app.post("/login", passport.authenticate("local", {
	successRedirect: "/",
	failureRedirect: "/user"		
}), function(req, res){
});

app.get("/logout", function(req, res){
	req.logout();
	res.redirect("back");
});

// user profile
app.get("/user/:user_id", function(req, res) {
  	User.findById(req.params.user_id, function(err, foundUser) {
    	if (err || !foundUser) {
    		console.log(err);
      		return res.render("back");
    	}
    	Vgram.find()
      		.where("author.id")
      		.equals(foundUser._id)
      		.exec(function(err, vgram) {
        		if (err) {
        			console.log(err);
          			res.render("back");
        		}
        		Comment.find()
          			.where("author.id")
          			.equals(foundUser._id)
          			.exec(function(err, ratedCount) {
            			if (err) {
            				console.log(err);
              				res.render("back");
            			}
            			res.render("usershow", {
              				user: foundUser,
              				vgram: vgram,
              				reviews: ratedCount
            			});
          			});
      		});
  	});
});

// edit profile
app.get("/user/:user_id/edit",isLoggedIn,function(req, res) {
    res.render("useredit", {user: req.user});
});

// update profile
app.put("/user/:user_id",isLoggedIn,function(req, res) {
    User.findByIdAndUpdate(req.params.user_id,req.body.user, function(err, user) {
      	if (err) {
      		console.log(err);
      	} else {
        	res.redirect("/user/" + req.params.user_id);
      	}
    });
});

// delete user
app.delete("/user/:user_id", isLoggedIn, function(req,res) {
  	User.findByIdAndRemove(req.params.user_id, function(err) {
    	if (err) {
    		console.log(err);
      		res.redirect("/vgram");
    	}else{
    		console.log(err);
        	res.redirect("/vgram");
      	}
  	});
});

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect("/user");
}

const host = "0.0.0.0";
const port = process.env.PORT || 3001;
app.listen(port,host, function() {
  console.log("Vgram is started!" + port);
});