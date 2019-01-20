#!/bin/bash
# Copyright (c) 2017 Intel Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

cat > /tmp/mosquitto_test.cpp << EOM
#include <cstdio>
#include <cstdlib>

#include <dlfcn.h>

struct KV {
   char* key;
   char* value;
};

typedef int (*mosquitto_auth_plugin_init)   (void** user_data, KV* auth_opts, int auth_opt_count);
typedef int (*mosquitto_auth_plugin_cleanup)(void* user_data, KV* auth_opts, int auth_opt_count);
typedef int (*mosquitto_auth_acl_check)     (void* user_data, const char *clientid, const char *username, const char *topic, int access);
typedef int (*mosquitto_auth_unpwd_check)   (void* user_data, const char *username, const char *password);

int main(int argc, char** argv)
{
	setvbuf(stdout,NULL,_IONBF,0);
	setvbuf(stderr,NULL,_IONBF,0);
	printf("starting...\n");
	void *myso = dlopen("./jwt_auth_plugin.so", RTLD_NOW | RTLD_GLOBAL);
	if(myso <= 0) {
		printf(".so loading failed, error: %s\n", dlerror());
		return 1;
	}

	mosquitto_auth_plugin_init    pluginit = (mosquitto_auth_plugin_init)    dlsym(myso, "mosquitto_auth_plugin_init");
	if(pluginit == NULL) { printf("Error loading function\n"); return 2; }
	mosquitto_auth_plugin_cleanup cleanup  = (mosquitto_auth_plugin_cleanup) dlsym(myso, "mosquitto_auth_plugin_cleanup");
	if(cleanup == NULL) { printf("Error loading function\n"); return 2; }
	mosquitto_auth_acl_check      acl      = (mosquitto_auth_acl_check)      dlsym(myso, "mosquitto_auth_acl_check");
	if(acl == NULL) { printf("Error loading function\n"); return 2; }
	mosquitto_auth_unpwd_check    unpwd    = (mosquitto_auth_unpwd_check)    dlsym(myso, "mosquitto_auth_unpwd_check");
	if(unpwd == NULL) { printf("Error loading function\n"); return 2; }

	int ret = 0;
	void* ptr = NULL;
	struct KV kv;
	kv.key = (char*)"path";
	kv.value = (char*)"./";

	printf("\n\n====================== INIT =======================\n\n");

	printf("About to run pluginit...\n");
	ret = pluginit(&ptr, &kv, 1);
	printf("\n\nret=%i, userdata=%p\n", ret, ptr);

	printf("\n\n====================== User/Password + DeviceID/Token =======================\n\n");

        printf("Testing real admin password\n");
        ret = unpwd(ptr, "admin", "password");
	printf("\nret=%i\n", ret);
	if(ret != 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }

        printf("Testing invalid admin password\n");
        ret = unpwd(ptr, "admin", "PASSWORD_wrong");
	printf("\nret=%i\n", ret);
	if(ret == 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing empty password\n");
        ret = unpwd(ptr, "", "");
	printf("\nret=%i\n", ret);
	if(ret != 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing NULL password\n");
        ret = unpwd(ptr, NULL, NULL);
	printf("\nret=%i\n", ret);
	if(ret != 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }



        printf("Testing real device token\n");
        ret = unpwd(ptr, "demoacc-power01", "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJiNGI2NDZlYS04MTQ0LTQ5ZGItOWY4Yi01MTYyZjFiOTk4MmUiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW90LmNvbSIsInN1YiI6ImRlbW9hY2MtcG93ZXIwMSIsImV4cCI6IjIwMjQtMTAtMTBUMDc6NTI6MzYuNTY1WiJ9.UMOej6BA8kBTxM2Ec2YGL7xdScRHFPP-zkw4rCO11HKjvk_H35VA8ReDI5yklHz2m91WerMLU8xonmse_tN61XfN1AumAgkdaImf8xvBr1ZqrNSt_NinFVIZcjhuRAH2Y_9Pra293d1Fg3KwgToaGJp11SwHjwzLSi5rvMXfuifBrWEGBIk0x_GBxnQvfQRRa0MtfgaZv7kPIAgkV6jNSm92n5vkXnYEiNWARqQ-6N05nhWBUDhFdJAdINA4fMBAsFd9sthtYjIyPXTSKFO93WDOUQHor8CkQaA3qvuXZleNIHpPrQYMCC3zk04FU5AdUQon5XMfMtAdAHSeVAC4MQ");
	printf("\nret=%i\n", ret);
	if(ret != 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing invalid device token\n");
        ret = unpwd(ptr, "demoacc-power01", "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJiNGI2NDZlYS04MTQ0LTQ5ZGItOWY4Yi01MTYyZjFiOTk4MmUiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW91LmNvbSIsInN1YiI6ImRlbW9hY2MtcG93ZXIwMSIsImV4cCI6IjIwMjQtMTAtMTBUMDc6NTI6MzYuNTY1WiJ9.UMOej6BA8kBTxM2Ec2YGL7xdScRHFPP-zkw4rCO11HKjvk_H35VA8ReDI5yklHz2m91WerMLU8xonmse_tN61XfN1AumAgkdaImf8xvBr1ZqrNSt_NinFVIZcjhuRAH2Y_9Pra293d1Fg3KwgToaGJp11SwHjwzLSi5rvMXfuifBrWEGBIk0x_GBxnQvfQRRa0MtfgaZv7kPIAgkV6jNSm92n5vkXnYEiNWARqQ-6N05nhWBUDhFdJAdINA4fMBAsFd9sthtYjIyPXTSKFO93WDOUQHor8CkQaA3qvuXZleNIHpPrQYMCC3zk04FU5AdUQon5XMfMtAdAHSeVAC4MQ");
	printf("\nret=%i\n", ret);
	if(ret == 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing non-matching token\n");
        ret = unpwd(ptr, "demoacc-OTHER", "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJiNGI2NDZlYS04MTQ0LTQ5ZGItOWY4Yi01MTYyZjFiOTk4MmUiLCJpc3MiOiJodHRwOi8vZW5hYmxlaW91LmNvbSIsInN1YiI6ImRlbW9hY2MtcG93ZXIwMSIsImV4cCI6IjIwMjQtMTAtMTBUMDc6NTI6MzYuNTY1WiJ9.UMOej6BA8kBTxM2Ec2YGL7xdScRHFPP-zkw4rCO11HKjvk_H35VA8ReDI5yklHz2m91WerMLU8xonmse_tN61XfN1AumAgkdaImf8xvBr1ZqrNSt_NinFVIZcjhuRAH2Y_9Pra293d1Fg3KwgToaGJp11SwHjwzLSi5rvMXfuifBrWEGBIk0x_GBxnQvfQRRa0MtfgaZv7kPIAgkV6jNSm92n5vkXnYEiNWARqQ-6N05nhWBUDhFdJAdINA4fMBAsFd9sthtYjIyPXTSKFO93WDOUQHor8CkQaA3qvuXZleNIHpPrQYMCC3zk04FU5AdUQon5XMfMtAdAHSeVAC4MQ");
	printf("\nret=%i\n", ret);
	if(ret == 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


	printf("\n\n====================== ACL =======================\n\n");

        printf("Testing NULL acl\n");
        ret = acl(ptr, "clientid", NULL, NULL, 0x3);
	printf("\nret=%i\n", ret);
	if(ret == 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing NULL acl with topic\n");
        ret = acl(ptr, "clientid", NULL, "device/demo-power01/cmpcatalog", 0x3);
	printf("\nret=%i\n", ret);
	if(ret == 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing valid acl - admin, any topic\n");
        ret = acl(ptr, "clientid", "admin", "device/demoacc-power01/cmpcatalog", 0x3);
	printf("\nret=%i\n", ret);
	if(ret != 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


        printf("Testing invalid acl for device\n");
        ret = acl(ptr, "clientid", "demoacc-power01", "device/demoacc-OTHER/cmpcatalog", 0x3);
	printf("\nret=%i\n", ret);
	if(ret == 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }

        printf("Testing valid acl - device\n");
        ret = acl(ptr, "clientid", "demoacc-power01", "device/demoacc-power01/cmpcatalog", 0x3);
	printf("\nret=%i\n", ret);
	if(ret != 0) {
		printf("\n\nFAILED!\n\n");
		return 1;
	} else { printf("OK!\n"); }


	printf("\n\n====================== CLEANUP =======================\n\n");


        printf("About to run cleanup...\n");
        ret = cleanup(ptr, &kv, 1);
	printf("\n\nret=%i\n", ret);

	printf("\n\n====================== SUCCESS! =======================\n\n");

	dlclose(myso);
	return 0;
}
EOM

g++ /tmp/mosquitto_test.cpp -pthread -Wall -ldl -ggdb -o /tmp/test.run && /tmp/test.run
RET=$?
echo "Return code: $RET"
exit $RET
