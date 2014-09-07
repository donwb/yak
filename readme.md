Splunking w/a Contrived YikYak API
===================

### tl;dr
I managed to get pretty decent performance numbers w/a few EC2 m1.mediums, node.js, and MongoDB

You can find an example of the load test results here: [http://ldr.io/1rPk6vi](http://ldr.io/1rPk6vi)

You can hit the api here:

* By Region: [http://yak.thd.io/api/yaksForArea/58](http://yak.thd.io/api/yaksForArea/58)
* By User: [http://yak.thd.io/api/yaksForUser/3](http://yak.thd.io/api/yaksForUser/3)


### Goal:
My goal with exercise was to see how many reqests/second I could get while maintaining a ~1 second response time.  How many boxes would it take in EC2 and how would MongoDB respond.

### Tech:
node.js and MongoDb - I chose 'em because (1) I'm comfortable with them and (2) I've kicked the tires quite a bit on this stuff, and this combo wins in most scenarios (religious debates aside)

### Architecture: 
To hit the req/sec goal, I wound up with:

* The [http://yak.thd.io](http://yak.thd.io) alias is CName for an Amazon Elastic Load Balancer (ELB)
* The ELB forwards traffic to 3 m1.medium instances running Ubuntu 12.04. This is an older EC2 compute instance type, but I had a build script for it, so that's what I went with.
* The 3 m1 instances are running node.js 10.31 and Express 4.
* The Database is a "sandbox" Mongo instance running on MongoLab.

### Stuff that would make it perform better:
Outside of spending time with strategic index placement, I didn't do a lot of optimization tweaking. Some additional stuff is below:

* **Sharding** - While it's tough for me to figure out what the shard-key would be w/o really knowing the data, I have made the assumption it's possible given how I think the data works. Coming up w/a strategy for sharding will allow the DB to scale almost infinitely.
* **Replica-sets** - Introducing a 3 node architecture for each shard of Primary/Secondary/Secondary will allow the reads to come from the replica and the writes to happen against the Primary.  This will prevent writes from blocking reads (i.e. when someone upvotes a yak).
* **Streaming** - Currently the app works based on "pull to refresh", which is probably hammering your back-end. Streaming new yaks to the client will take quite a load off the back-end infrastructure.
* **A "paid instance" of MongoDb** - This thing is running on sandbox stuff in MongoLab (considering it's free, it's performing admirably). That said, spending a few bucks on the DB will speed things up dramatically.
* **Newer EC2 instance type** - As I mentioned, the m1.medium instance type is older and slower than the newer stuff Amazon has. I'm guessing m3.* would be faster
* **HA Proxy** - While ELB is convenient, for production I would front-end the cluster w/HA Proxy instead.
* **Proxy node via/nginx** - On each instance, I would use nginx to proxy traffic to node.js. Right now all traffic is being handled/brokered by node directly.
* **Caching** - In the right places, i'm sure short-circuiting the calls to Mongo w/REDIS would speed things up quite a bit.
* **1-VCPU** - Rather than using Cluster in node, I went w/a single VCPU instance type. Shifting to Cluster would allow node to take advantage of larger, multi-core instances.
* **A thousand other things**

### Assumptions
I have no idea how the actual api works, so I operated on the following assumptions:

* I took a stab at what a Yak looks like based on using the app
* I created a RegionId, rather than doing geocalculations each time you request yaks for an "area". I can see how you could create a 1 1/2 mile buffer around the requesters current location and grab all the yaks within that area.  That said, in looking at how the "peek" stuff works, it seems there are specific, static areas that people fall within, so I went that route.
* If you did need a dynamically moving 1 1/2 mile radius query, MongoDb can handle that also.
* I seeded the DB with 1,000,000 documents.  I'm sure that is no where close to the amount of data in the current MySQL instance, but it might be an accurate reflection of how many "hot" records you have based on how the app works. There are some suggestions for making this scale to real-world volumes above.
* I didn't choose to SSL the endpoints, mostly to save time/configuration hassle. Obviously, this would slow things down a bit, but it's just compute. More boxes would solve that issue.
* The data all looks the same, and the perf tests go after the same region each time. I'm sure JMeter or something else would provide more real-world usage patterns, but hell.. it was a couple hours over the weekend.. :)


