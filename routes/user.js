var express = require('express');
var router = express.Router();
const productHelpers=require('../helpers/product-helpers');
const userHelpers=require('../helpers/user-helper');
const { USER_COLLECTION } = require('../config/collections');
const verifylogin=(req,res,next) =>{
  if(req.session.userLoggedIn)
  {
    next()
  }else{
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/',async function(req, res, next) {
  let user=req.session.user
   let cartCount=null
  if(req.session.user){
  cartCount=await userHelpers.getCartCount(req.session.user._id)
  }
    productHelpers.getProduct().then((products)=>{
      res.render('user/view-product',{products,user})
    })
  });
  /* get login */
   router.get('/login',(req,res) =>{
  if(req.session.user)
  {
    res.redirect('/')
  }else{
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
    }
  })
  /* signup*/
  router.get('/signup',(req,res) =>{
    res.render('user/signup')
  })
  router.post('/signup',(req,res) =>{
    userHelpers.doSignup(req.body).then((response) =>{
console.log(response);
req.session.user=response.user
req.session.userLoggedIn=true
res.redirect('/')
    })
  })
   /* post login */ 
   router.post('/login',(req,res) =>{
    userHelpers.doLogin(req.body).then((response)=>{
      if(response.status)
      {
        req.session.user=response.user
        req.session.userLoggedIn=true
        res.redirect('/')
      }
      else{
        req.session.userLoginErr="invalid username or password"
        res.redirect('/login')
      }
    })
  })
  /* post login */
  router.get('/logout',(req,res) =>{
    req.session.user=null
    req.session.userLoggedIn=false
        res.redirect('/')
  })
  /* get cart */
  router.get('/cart',verifylogin,async(req,res) =>{
    let products=await userHelpers.getCartProducts(req.session.user._id)
    console.log(products);
    let totalValue=0
    // if(products.length>0){
      totalValue=await userHelpers.getTotalAmount(req.session.user._id)
    // }  
      // totalValue
      let user=req.session.user._id
    res.render('user/cart',{products,user,totalValue})
    // console.log(products);
  })
  /* add to cart */
  router.get('/add-to-cart/:id',verifylogin,(req,res)=>{
    // console.log("api call")
      userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{ 
        // res.json({status:true})
         res.redirect('/')
    })
  })
  router.post('/change-product-quantity',(req,res,next)=>{
    console.log(req.body);
    userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
    })
  })
  router.post('/remove',(req,res,next)=>{
    console.log(req.body);
    userHelpers.remove(req.body).then((response)=>{
    res.json(response)
    })
  })
  router.get('/place-order',verifylogin,async (req,res)=>{
     let total=await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/place-order',{total,user:req.session.user})
  })
  router.post('/place-order',async(req,res)=>{
    let products=await userHelpers.getCartProductList(req.body.userId)
    let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
    userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
      if(req.body['payment-method']==='cod'){
        res.json({codStatus:true})
      }else{
        userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
          res.json(response)
        })
      }
    })
    // console.log(req.body)
  })
  router.get('/order-success',verifylogin,(req,res)=>{
    res.render('user/order-success',{user:req.session.user})
  })
  router.get('/orders',verifylogin,async(req,res)=>{
    let orders=await userHelpers.getOrders(req.session.user._id)
    res.render('user/orders',{user:req.session.user,orders})
  })
  router.get('/view-order/:id',verifylogin,async(req,res)=>{
    let orders=await userHelpers.viewProduct(req.params.id)
    console.log(orders);
    res.render('user/view-order',{user:req.session.user,orders})
  })
  router.post('/verify-payment',(req,res)=>{
    console.log(req.body);
    userHelpers.verifyPayment(req.body).then(()=>{
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
        res.json({status:true})
      })
     }).catch((err)=>{
      console.log(err);
      res.json({status:false,errMsg:''})
     })
  })
module.exports = router;
// router.get('/remove-cart',(req,res)=>{
//   //   //  let cartId=req.params.id
//    userHelpers.removeCart(req.body).then((response)=>{
//     res.json(response)
//      })
//     })
