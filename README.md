# Redpoint
> Redpoint libs for querying trade simulator and swap backend.

There are two main parts of Defiant's service. The trade simulator and the swap backend. The trade simulator is currently in production for Osmosis, and is hosted by Defiant Labs. 

## Trade Simulator
This is a REST API you can query, specifying what trade the user wants to make (e.g. 1000 JUNO for OSMO). Prior to querying the API to simulate trades, you MUST query to get a JWT. The JWT will then be included with future requests. See simulator.ts.

## Trade Backend
Basically, this trade backend is used to submit trades. First, you use the simulator to simulate the trade. Then you use the trade backend to submit the trade. Defiant Labs provides the code for this at https://github.com/DefiantLabs/RedpointSwap, it is currently in late testing stages. We do not host this service, you must run it yourself. You must get a JWT to use this service (separate JWT from the one used for the simulator). See backend.ts and flow.ts. The code in flow.ts will get the JWT for this service.

## Notes
Overall, you always need a JWT before doing anything else. Then simulator.ts should be queried first to simulate a trade. It will return a simulated trade (object) which can then be directly submitted to the trade backend using the functions in backend.ts.