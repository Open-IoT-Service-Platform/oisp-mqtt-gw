========================================
| Mosquitto JWT authentication plugin  |
========================================

DEPENDENCES

   aptitude install python-dev libffi-dev      # python 2.7

   pip install pymongo PyJWT PyCrypto cryptography
   
   You will also need working MongoDB cluster.
   
   WARNING: Previously, PyJWT required PyCrypto. Now it changed dependency to cryptography :(

COMPILATION

   # Download mosquitto-1.3.5.tar.gz
   
   $ tar -xf mosquitto-1.3.5.tar.gz
   $ cd mosquitto-1.3.5
   
   Place module there. It should look like this:
   
    mosquitto-1.3.5/
      │
      ├── mosquitto.conf
      ├── mosquitto_jwt_auth                     #  <---- main plugin directory
      │   ├── build.sh                           #  <- build script
      │   ├── jwt_auth_plugin                    #  <- Python code directory
      │   │   ├── config.py                      #  <- Config file - adjust for your needs
      │   │   ├── __init__.py                    #  <- Python code of the JWT module
      │   │   └── pub_jwt_key.pem                #  <- JWT public RSA key
      │   ├── jwt_auth_plugin.c                  #  <- C source of the JWT plugin
      │   ├── jwt_auth_plugin.so                 #  <- $SHARED_LIBRARY target shared library
      │   ├── README.txt                         #  <- this file
      │   ├── selftest.sh                        #  <- execute to run tests (they use mongodb)
      │   └── utility-scripts                    #  <- directory with various test scripts
      │       ├── sub.sh                         #  \
      │       ├── superuserpub.sh                #   \ test
      │       ├── superuser.sh                   #   / tools
      │       └── test.sh                        #  /
     (...)
   
   $ cd mosquitto_jwt_auth
   $ ./build.sh
   
   $ vi config.py
      # edit values as described inside; the most important ones: 
      #        SUPERUSERS - dict of login/password of MQTT superusers.
      #        MONGO_INSTANCES - mongo connection string host:port,host2:port2,...
      #        THIS_MACHINE_IP - fill with IP of machine on which mosquitto is running
      #        THIS_MACHINE_BROKER_PORT - fill with TCP port on which *this* mosquitto is running
      #
   $ ./selftest.sh
   $  # expect "Testing complete! Working as expected."
   $ cd ..   # navigate to main mosquitto package
   $ vi mosquitto.conf
      # append:
      
         # full path to library:
         auth_plugin   /full/path/to/mosquitto_jwt_auth/jwt_auth_plugin.so 
         
         # full path to main plugin directory
         auth_opt_path /full/path/to/mosquitto_jwt_auth/
         
   $ mosquitto -c mosquitto.conf
      
      
