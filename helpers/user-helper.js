var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('express');
const Razorpay=require('razorpay');

var instance = new Razorpay({
  key_id: 'rzp_test_2nxUKD1HJpEQAf',
  key_secret: 'dU4sdswuoMPp60bBAgf2lwbD',
});
module.exports={
doSignup:(userData) =>{
    console.log(userData);
    return new Promise(async(resolve,reject) =>{
        userData.password= await bcrypt.hash(userData.password,10)
        db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) =>{
        userData._id=data.insertedId
            resolve(userData)
        })       
    })
},
doLogin:(userData) =>{
    return new Promise(async (resolve,reject) =>{
        let loginStatus=false
        let response={}
        let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
if(user)
{
    bcrypt.compare(userData.password,user.password).then((status) =>{
        console.log(status);
        if(status)
        {
            console.log("login success");
            response.user=user
            response.status=true
            resolve(response)
        }else {
            console.log("login failed");
            resolve({status:false})
        }
    })
}else{
    console.log("user not found");
    resolve({status:false})
}
    })
},
addToCart:(proId,userId)=>{
    let proObj={
        item:new ObjectId(proId),
        quantity:1
    }
    return new Promise(async(resolve,reject)=>{
        let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})  
        console.log(userCart)   
        if(userCart){
             let proExist=userCart.product.findIndex(prod=> prod.item==proId)
             console.log(proExist);
              if(proExist!=-1){
                 db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:new ObjectId(userId),'product.item':new ObjectId(proId)},
                 {
                    $inc:{'product.$.quantity':1}

               }
                 ).then(()=>{
                  resolve()
                 })
              }else{
                 db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:new ObjectId(userId)},
                 {                                  
                         $push:{product:proObj}
                 }
                     )
                  .then((response)=>{
                        resolve()
                   })
             }
        }else{
            let cartObj={
                user:new ObjectId(userId),
                product:[proObj]
            }
            db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                resolve()
            })
        }
     })
        
},
getCartProducts:(userId)=>{
    return new Promise(async(resolve,reject)=>{
        let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
                $match:{user:new ObjectId(userId)}
            },
            {
                $unwind: '$product'
            },
            {
                $project:{
                item: '$product.item',
                // price:'$product.price',
                quantity: '$product.quantity'           
                }
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'prod'
                }
            },
            {
                $project:{
                    item:1,quantity:1,products: {$arrayElemAt:['$prod',0]}
                }
            }
        ]).toArray()
            resolve(cartItems);
    })
},
getCartCount:(userId)=>{
    return new Promise(async(resolve,reject)=>{
        let count=0
        let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
        console.log(cart)
        if(cart){
            db.get().collection(collection.CART_COLLECTION).aggregate( [
                {
                          $match: {user:new ObjectId(userId)}
                        },
                        {
                            $group: { count:{ $sum: '$cart.product.quantity' } }
                               }
                             ] 
                             )                          
        }
    resolve(count)
    })
},
changeProductQuantity:(details)=>{
    details.count=parseInt(details.count)
    details.quantity=parseInt(details.quantity)
    return new Promise(async (resolve,reject)=>{
        if(details.count==-1  && details.quantity==1){
         db.get().collection(collection.CART_COLLECTION).updateOne({_id:new ObjectId(details.cart)},
                { $pull: { product:{ item:new ObjectId(details.product) } } }  
            ).then((response)=>{
                resolve({removeProduct:true})
            })
        }
        else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:new ObjectId(details.cart),'product.item':new ObjectId(details.product)},
             {
                $inc:{'product.$.quantity':details.count}
             }
           ).then((response)=>{
            resolve({status:true})
           }) 
        }
// h
    })
},
remove:(details)=>{
    details.quantity=parseInt(details.quantity)
    return new Promise(async (resolve,reject)=>{
        if(details.quantity){
         db.get().collection(collection.CART_COLLECTION).updateOne({_id:new ObjectId(details.cart)},
                { $pull: { product:{ item:new ObjectId(details.product) } } }  
            ).then((response)=>{
                resolve({remove:true})
            })
        }
    })
},
 getTotalAmount:(userId)=>{
    return new Promise(async (resolve,reject)=>{
       let  total=await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
                $match:{user:new ObjectId(userId)}
            },
            {
                $unwind: '$product'
            },
            {
                $project:{
                item: '$product.item',
                quantity: '$product.quantity'           
                }
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'prod'
                }
            },
            {
                $project:{
                    item:1,quantity:1,products: {$arrayElemAt:['$prod',0]}
                }
            },
            {
                $group:{
                    _id:null,
                    total:{$sum:{$multiply:[{$toInt:"$quantity"},{$toInt:"$products.price"}]}}
                }
            }
        ]).toArray()
        if(total[0]){
            resolve(total[0].total);
        }
        else{
            resolve([]);
        }
})
},
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{  
          console.log(order,products,total);
          let status=order['payment-method']==='cod'?'placed':'pending'
          let orderObj={
            deliveryDetails:{
                mobile:order.mobileno,
                address:order.address,
                pincode:order.pincode
            },
            userId:new ObjectId(order.userId),
            paymentMethod:order['payment-method'],
            products:products,
            price:total,
            Date:new Date(),
            status:status
          }
          db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            // db.get().collection(collection.CART_COLLECTION).deleteOne({user:new ObjectId(order.userId)})
            resolve(response.insertedId)
          })  

        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            console.log(userId)
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            console.log(cart)
            resolve(cart.product)
        })     
    },
    getOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
        let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
        console.log(orders);
    resolve(orders)
        })
    },
    viewProduct:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{_id:new ObjectId(orderId)}
            },
            {
                $unwind: '$products'
            },
            {
                $project:{
                item: '$products.item',
                quantity: '$products.quantity'           
                }
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'prod'
                }
            },
            {
                $project:{
                    item:1,quantity:1,products: {$arrayElemAt:['$prod',0]}
                }
            }
        ]).toArray()
        console.log(orderItems)
            resolve(orderItems);
    })
    },
    generateRazorpay:(orderId,totalPrice)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: totalPrice*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                if(err){
                    console.log(err)
                }else{
                console.log("new order:",order);
                resolve(order)
                }
              });
        })
    },
     verifyPayment:(details)=>{
         return new Promise((resolve,reject)=>{
             const crypto=require('crypto');
              let hmac=crypto.createHmac('sha256','dU4sdswuoMPp60bBAgf2lwbD')
          hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
          hmac=hmac.digest('hex')
          if(hmac==details['payment[razorpay_signature]']){
            resolve()
          }
          reject()
        })
     },
     changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:new ObjectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })

        })
     }
}

