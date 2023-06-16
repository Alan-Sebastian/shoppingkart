var express = require('express');
var router = express.Router();
const productHelpers=require('../helpers/product-helpers');
const verifyLogin=(req,res,next) =>{
  if(req.session.adminLoggedIn)
  {
    next()
  }else{
    res.redirect('/login')
  }
}
/* GET users listing. */
router.get('/',verifyLogin, function(req, res, next) {
  let admin=req.session.admin
     productHelpers.getProduct().then((products)=>{
      // res.render('admin/admin-login')
      res.render('admin/view-product',{admin:true,products})
  })
 })
router.get('/admin-login',(req,res) =>{
  if(req.session.admin)
  {
    res.redirect('/')
  }else{
    res.render('admin/admin-login',{"loginErr":req.session.adminLoginErr})
    req.session.adminLoginErr=false
    }
  })
  router.post('/admin-login',(req,res) =>{
    productHelpers.doLogin(req.body).then((response)=>{
      if(response.status)
      {
        req.session.admin=response.admin
        req.session.adminLoggedIn=true     
        res.redirect('/admin')   
      }
      else{
        req.session.userLoginErr="invalid username or password"
        res.redirect('/login')
      }
    })
  })
  /* post login */
   router.get('/logout',(req,res) =>{
     req.session.admin=null
     req.session.adminLoggedIn=false
   res.redirect('/admin-login')
   })
router.get('/add-product',function(req,res){
  res.render('admin/add-product')
})
router.post('/add-product',(req,res)=>
{
productHelpers.addProduct(req.body,(id)=>{
  let image=req.files.image
  console.log(id);
  image.mv('./public/product-images/'+id+'.jpg',(err)=>{
    if(!err){
      res.render('admin/add-product')
    }
    else{
      console.log(err);
    }
  })
})
})
router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/')
  })
})
router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelpers.getProductDetail(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product})
})
router.post('/edit-product/:id',(req,res)=>{
   let id=req.params.id
  console.log(req.params.id);
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){
      let image=req.files.image
      
      image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})
router.get('/orders',verifyLogin,async (req,res)=>{
  productHelpers.getOrders().then((orders)=>{
  res.render('admin/orders',{admin:true,orders})
  console.log(orders);
  })
})
module.exports = router;
