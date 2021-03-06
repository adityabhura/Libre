var express=require("express");
var router=express.Router();
var Product=require("../models/product.js");
var mongoose=require("mongoose");
var User=require("../models/user.js");
var Comment=require("../models/comments.js");
var request=require("request");
// var clearRequire = require('clear-require');
// const decache = require('decache');


var multer=require("multer");
const { findById, db } = require("../models/user.js");

var storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"./uploads/");
    },
    filename:function(req,file,cb){
        cb(null,file.fieldname + file.originalname);
    }
})
var upload=multer({storage:storage,
                    limits:{
                        fileSize:1024*1024*5,
                    },
                    fileFilter: (req, file, cb) => {
                        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
                          cb(null, true);
                        } else {
                          cb(null, false);
                          return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
                        }
                      }
}).array('image',1);

var successMessage={
    message:"Success"
}

var errorMessage={
    message:"Fail"
}


mongoose.set('useFindAndModify', false);


router.get("/products",function(req,res){
    var xerox=req.query.xerox;
    var currentUser=req.user;
    // console.log(req.session);
    // console.log(req.sessionID)
    Product.find({},function(err,products){
        if(err){
            console.log(err);
        }else{
            if(xerox==="book"){
                res.send({products,currentUser});
            }else{
                res.render("index",{products:products,currentUser:currentUser});
            }
        }
    })
});

router.get("/products/new",isLoggedIn,function(req,res){
    res.render("new");
})

router.post("/products",isLoggedIn,(req,res,next)=>{upload(req,res,function(err){
    if(err){
            req.flash("error","Only .png, .jpg and .jpeg format allowed!")
            res.redirect("/products/new");      
    }else{
        next();
    }
})},function(req,res){
    var title=req.body.title;
    var description=req.body.description;
    var address={
        area:req.body.area,
        city:req.body.city,
        state:req.body.state,
        country:req.body.country
    };
    var phoneNumber=req.body.phoneNumber
    console.log(req.body.phoneNumber);
    var author={
        id:req.user._id,
        username:req.user.username
    };
    var amount=req.body.amount;
    var bookauthor=req.body.bookauthor;
    //for uploading image
    var image=[];
    req.files.forEach(function(file){
        image.push(file.path)
    });   
        Product.create({
        title:title,
        description:description,
        author:author,
        amount:amount,
        address:address,
        phoneNumber:phoneNumber,
        image:image,
        bookauthor:bookauthor,
    },function(err,newProduct){
        if(err){
            console.log(err);
                res.send("Error");
        }else{
            User.findById(req.user._id,function(err,user){
                user.myproducts.push(newProduct)
                user.save();
                res.redirect("/products"); 
                console.log(newProduct);
                console.log(user.myproducts)
            })        
        }
    })
});


//Post route for adding new book in Mobile App
router.post("/products/xeroxbook",isLoggedIn,(req,res,next)=>{upload(req,res,function(err){
    if(err){
            res.send({
                "message":"Invalid File Format"
            });    
    }else{
        next();
    }
})},function(req,res){
    var title=req.query.title;
    var description=req.query.description;
    var address={
        area:req.query.area,
        city:req.query.city,
        state:req.query.state,
        country:req.query.country
    };
    var phoneNumber=req.query.phoneNumber
    console.log(req.query.phoneNumber);
    var author={
        id:req.user._id,
        username:req.user.username
    };
    var amount=req.query.amount;
    var bookauthor=req.query.bookauthor;
    //for uploading image
    var image=[];
    req.files.forEach(function(file){
        image.push(file.path)
    });
        Product.create({
        title:title,
        description:description,
        author:author,
        amount:amount,
        address:address,
        phoneNumber:phoneNumber,
        image:image,
        bookauthor:bookauthor,
    },function(err,newProduct){
        if(err){
            console.log(err);
            res.send(errorMessage);
        }else{
            User.findById(req.user._id,function(err,user){
                user.myproducts.push(newProduct)
                user.save();
                res.send(successMessage);
                console.log(newProduct);
                console.log(user.myproducts)
            })
          }
       })
   });



//show page
router.get("/products/:id",isLoggedIn,function(req,res){
    var xerox=req.query.xerox;
    var currentUser=req.user;
    Product.findById(req.params.id).populate({path:"comments",model:Comment}).exec(function(err,selectedProduct){
        if(err){
            console.log(err);
        }else{
            if(xerox==="book"){
                res.send(selectedProduct);
            }else{
                console.log(selectedProduct);
                res.render("show",{product:selectedProduct,currentUser:currentUser});
            }
        }
    });
});

router.get("/products/:id/edit",checkUser,function(req,res){
    var xerox=req.query.xerox;
    Product.findById(req.params.id,function(err,product){
            if(xerox==="book"){
                res.send(product);
            }
            else{
                res.render("edit",{product :product}); 
            }
                   
    })
});

//put or update route
router.put("/products/:id",checkUser,function(req,res){
    var xerox=req.query.xerox;
    console.log(req.body);
    req.body.product.description=req.sanitize(req.body.product.description);
    Product.findByIdAndUpdate(req.params.id,req.body.product,function(err,product){
        if(err){
            if(xerox==="book"){
                res.send(errorMessage);
            }else{
                res.send("Error");
            }
        }else{
            if(xerox==="book"){
                res.send(successMessage);
            }else{
                console.log(product);
                res.redirect("/products/" + req.params.id);
            }
            
        }
            
    });
 });

 //delete route
 router.delete("/products/:id",checkUser,function(req,res){
    var xerox=req.query.xerox;
    Product.findByIdAndRemove(req.params.id,function(err){
            if(err){
                if(xerox==="book"){
                    res.send(errorMessage);
                }else{
                    res.send("Error");
                }  
            }else{
                if(xerox==="book"){
                    res.send(successMessage);
                }else{
                    req.flash("success","Book Removed")
                    res.redirect("/products");
                }

            }
            
        });
 });



//bookmark routes//
//*****Adding and deleting bookmark post route*****/
router.post("/bookmark/:id/:userId",isLoggedIn,function(req,res){
    var xerox=req.query.xerox;
    var x=0;
    User.findById(req.user._id,function(err,user){
        if(err){
            console.log(err);
        }else{
            if(req.body.bookmark==="N"){
                var index=user.bookmarks.indexOf(req.params.id);
                if(index>-1){
                    if(xerox==="book"){
                        res.send({"message":"This Book is already added to bookmarks"});
                    }else{
                        req.flash("error","Already added to Bookmarks");
                        res.redirect("/products/" + req.params.id);
                    }
                }else{
                    user.bookmarks.push(req.params.id);
                    user.save();
                    console.log("Bookmarked");
                    console.log(user.bookmarks);
                    if(xerox==="book"){
                        res.send({"message":"Added to Bookmarks"});
                    }else{
                        req.flash("success","Added to Bookmarks");
                        res.redirect("/products/" + req.params.id);
                    } 
                }      
            }
            if(req.body.bookmark==="Y"){
                        var index = user.bookmarks.indexOf(req.params.id);
                        console.log(index);
                        if(index>-1){
                            user.bookmarks.splice(index,1);
                        }
                        user.save();
                        if(xerox==="book"){
                            if(index==-1){
                                res.send({"message":"Index is -1"});  
                            }else{
                                res.send({"message":"Removed From Bookmarks"});
                            }
                        }else{
                            req.flash("success","Removed From Bookmarks");
                            res.redirect("/products/" + req.params.id);
                        } 
                        console.log("Bookmark Removed");
                        console.log(user.bookmarks);   
                }
            }
            
        }
    )
})



//***********search route***********//
router.get("/search",isLoggedIn,function(req,res){
    var xerox=req.query.xerox;
    var searchText=(req.query.search);
    
    if(!searchText){
            if(xerox==="book"){
                res.send({"message":"No results Found"});
            }else{
                req.flash("error","No results Found");
                res.redirect("/products");
            }
            
        }else{
            db.collection("products").find({title:new RegExp(searchText,"i")}).toArray(function(err,data){
                
                if(err){
                    if(xerox==="book"){
                        res.send({"message":"Error"});
                    }else{
                        res.send(err);
                    }
                }else{
                    if(xerox==="book"){
                        if(!data[0]){
                            res.send({"message":"No results found"});
                        }else{
                            res.send(data);
                        }
                    }else{
                        if(!data[0]){
                            req.flash("error","No results Found");
                            res.redirect("/products");
                        }else{
                            res.render("search.ejs",{products:data});
                        }
                    }
                }
                }
            );
        }
    
})



 
//if logged in function
    function isLoggedIn(req,res,next){
        if(req.isAuthenticated()){
            return next();
        }
            req.flash("error","You need to be logged in")
            res.redirect("/login");   
}

//check user logged in
    function checkUser(req,res,next){
        if(req.isAuthenticated()){
            Product.findById(req.params.id,function(err,foundProduct){
                if(err){
                    console.log(err);
                }else{
                    if(foundProduct.author.id.equals(req.user._id)){
                        next();
                    }else{
                        req.flash("error","You are not allowed to do that");
                        res.redirect("back");
                    }
                }
            })
        }
    }


    // //******TESTING*****//
    // router.post('/a',(req,res,next)=>{
    //     // JSON.parse(req.body);
    //     res.send(req.body);
    //   });

 module.exports=router;


