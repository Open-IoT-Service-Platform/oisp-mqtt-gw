/**
* Copyright (c) 2017 Intel Corporation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

#include "../lib/mosquitto.h"
#include "../src/mosquitto_plugin.h"

#include <Python.h>

#include <unistd.h>

#include <stdlib.h>
#include <stdio.h>

typedef struct JwtAuthPluginUserData_
{
    PyObject* jwt_auth_pymodule;
    PyObject* check_user_pass_pyfunction;
    PyObject* topic_acl_pyfunction;
} JwtAuthPluginUserData;


int mosquitto_auth_plugin_version(void)
{
    fprintf(stderr, "jwt_auth_plugin: version requested!\n");
    return MOSQ_AUTH_PLUGIN_VERSION;
}

int mosquitto_auth_plugin_init(void **user_data, struct mosquitto_auth_opt *auth_opts, int auth_opt_count)
{
    fprintf(stderr, "jwt_auth_plugin: mosquitto_auth_plugin_init()\n");

    JwtAuthPluginUserData* jwtdata = malloc(sizeof(JwtAuthPluginUserData));
    memset(jwtdata, 0, sizeof(JwtAuthPluginUserData));

    fprintf(stderr, "jwt_auth_plugin: Py_Initialize()...\n");
    Py_Initialize();
    fprintf(stderr, "jwt_auth_plugin: Py_Initialize() - OK!\n");

    for(int i=0; i<auth_opt_count; i++)
    {
       fprintf(stderr, "jwt_auth_plugin: config[%i]: %s=%s\n", i, auth_opts[i].key, auth_opts[i].value);
       if( strcmp(auth_opts[i].key, "path") == 0) // we need to add our python module to sys.path:
       {
         fprintf(stderr, "jwt_auth_plugin: setting auth_opt_path = %s\n", auth_opts[i].value);
         PyRun_SimpleString("import sys\n");
         char* python_path_update = NULL;
         int res = asprintf(&python_path_update, "sys.path.append( \"%s\")\n", auth_opts[i].value);
         if(res < 0)
         {
             fprintf(stderr, "jwt_auth_plugin: asprintf failed!\n");
             return 1;
         }
         PyRun_SimpleString(python_path_update);
         free(python_path_update);
       }
    }

    PyObject* pName = PyUnicode_FromString("jwt_auth_plugin");
    PyObject* pModule = PyImport_Import(pName);
    Py_DECREF(pName);

    if (pModule != NULL)
    {
        PyObject* pFunc_check_user_pass = PyObject_GetAttrString(pModule, "check_user_pass");
        if (pFunc_check_user_pass && PyCallable_Check(pFunc_check_user_pass))
        {
            PyObject* pFunc_topic_acl = PyObject_GetAttrString(pModule, "topic_acl");
            if (pFunc_topic_acl && PyCallable_Check(pFunc_topic_acl))
            {
                jwtdata->jwt_auth_pymodule = pModule;
                jwtdata->check_user_pass_pyfunction = pFunc_check_user_pass;
                jwtdata->topic_acl_pyfunction = pFunc_topic_acl;
                *user_data = (void*)jwtdata;
                fprintf(stderr, "jwt_auth_plugin: OK - all required python objects were loaded.\n");
                return 0;
            }
            else
            {
                fprintf(stderr, "jwt_auth_plugin: error loading function from module!\n");
                if (PyErr_Occurred())
                {
                    PyErr_Print();
                }
                Py_DECREF(pFunc_topic_acl);
                Py_DECREF(pFunc_check_user_pass);
                Py_DECREF(pModule);
                return 1;
            }
        }
        else
        {
            fprintf(stderr, "jwt_auth_plugin: error loading function from module!\n");
            if (PyErr_Occurred())
            {
                PyErr_Print();
            }
            Py_DECREF(pFunc_check_user_pass);
            Py_DECREF(pModule);
            return 1;
        }
    }
    else
    {
        fprintf(stderr, "jwt_auth_plugin: error loading module!\n");
        if (PyErr_Occurred())
        {
            PyErr_Print();
        }
        Py_DECREF(pModule);
        return 1;
    }
    return 1;
}

int mosquitto_auth_plugin_cleanup(void *user_data, struct mosquitto_auth_opt *auth_opts, int auth_opt_count)
{
    fprintf(stderr, "jwt_auth_plugin: cleanup\n");
    JwtAuthPluginUserData* jwtdata = (JwtAuthPluginUserData*)user_data;
    if(jwtdata == NULL)
    {
        printf("error!\n");
        return 1;
    }
    else
    {
        Py_DECREF(jwtdata->check_user_pass_pyfunction);
        Py_DECREF(jwtdata->topic_acl_pyfunction);
        Py_DECREF(jwtdata->jwt_auth_pymodule);
        fprintf(stderr, "jwt_auth_plugin: will now finalize...\n");
        Py_Finalize();
        fprintf(stderr, "jwt_auth_plugin: finalized!\n");
        return 0;
    }
    return 1;
}

int mosquitto_auth_security_init(void *user_data, struct mosquitto_auth_opt *auth_opts, int auth_opt_count, bool reload)
{
    fprintf(stderr, "jwt_auth_plugin: security init\n");
    return 0;
}

int mosquitto_auth_security_cleanup(void *user_data, struct mosquitto_auth_opt *auth_opts, int auth_opt_count, bool reload)
{
    fprintf(stderr, "jwt_auth_plugin: security cleanup\n");
    return 0;
}

int mosquitto_auth_acl_check(void *user_data, const char *clientid, const char *username, const char *topic, int access)
{

    fprintf(stderr, "jwt_auth_plugin: acl check user=%s topic=%s clientid=%s userdata=%p\n", username, topic, clientid, user_data);

    int ret = MOSQ_ERR_UNKNOWN;
    JwtAuthPluginUserData* jwtdata = (JwtAuthPluginUserData*)user_data;
    if(jwtdata == NULL)
    {
        fprintf(stderr, "jwt_auth_plugin: jwtdata is NULL!\n");
        return MOSQ_ERR_UNKNOWN;
    }

    PyObject* pArgs = PyTuple_New(2);
    PyObject* pyTopic = (topic == NULL) ? PyUnicode_FromString("") : PyUnicode_FromString(topic);
    PyTuple_SetItem(pArgs, 0, pyTopic);
    PyObject* pyDeviceId = (username == NULL) ? PyUnicode_FromString("") : PyUnicode_FromString(username);
    PyTuple_SetItem(pArgs, 1, pyDeviceId);

    // call "topic_acl( topic, deviceid )":
    PyObject* pyResult_check_acl =
        PyObject_CallObject(jwtdata->topic_acl_pyfunction, pArgs);

    if(pyResult_check_acl)
    {
        long res = PyLong_AsLong(pyResult_check_acl);
        fprintf(stderr, "jwt_auth_plugin: Result of call: %ld\n", res);
        if(res == 1L)
        {
            fprintf(stderr, "jwt_auth_plugin: ACL OK!\n");
            ret = MOSQ_ERR_SUCCESS;
        }
        else if(res == 0L) {
            fprintf(stderr, "jwt_auth_plugin: ACL failed!\n");
            ret = MOSQ_ERR_ACL_DENIED;
        }
        else {
            fprintf(stderr, "jwt_auth_plugin: ACL ERROR! res=%ld\n", res);
            if (PyErr_Occurred())
            {
                PyErr_Print();
            }
            ret = MOSQ_ERR_UNKNOWN;
        }
    } else {
        fprintf(stderr, "jwt_auth_plugin: error!\n");
        if (PyErr_Occurred())
        {
            PyErr_Print();
        }
    }
    Py_DECREF(pArgs);
    Py_DECREF(pyResult_check_acl);

    return ret;
}

int mosquitto_auth_unpwd_check(void *user_data, const char *username, const char *password)
{
    int ret = MOSQ_ERR_UNKNOWN;
    fprintf(stderr, "jwt_auth_plugin: auth unpwd check user=%s pass=<deleted>\n", username);
    JwtAuthPluginUserData* jwtdata = (JwtAuthPluginUserData*)user_data;
    if(jwtdata == NULL)
    {
        fprintf(stderr, "jwt_auth_plugin: jwtdata is NULL!\n");
        return MOSQ_ERR_UNKNOWN;
    }

    PyObject* pArgs = PyTuple_New(2);
    PyObject* pyDeviceId = (username == NULL) ? PyUnicode_FromString("") : PyUnicode_FromString(username);
    PyTuple_SetItem(pArgs, 0, pyDeviceId);
    PyObject* pyToken = (password == NULL) ? PyUnicode_FromString("") : PyUnicode_FromString(password);
    PyTuple_SetItem(pArgs, 1, pyToken);

    /* call "check_user_pass( deviceid, token )": */
    PyObject* pyResult_check_user_pass =
        PyObject_CallObject(jwtdata->check_user_pass_pyfunction, pArgs);

    if(pyResult_check_user_pass)
    {
        long res = PyLong_AsLong(pyResult_check_user_pass);
        fprintf(stderr, "jwt_auth_plugin: Result of call: %ld\n", res);
        if(res == 1L)
        {
            fprintf(stderr, "jwt_auth_plugin: auth OK!\n");
            ret = MOSQ_ERR_SUCCESS;
        }
        else if(res == 0L) {
            fprintf(stderr, "jwt_auth_plugin: auth failed!\n");
            ret = MOSQ_ERR_AUTH;
        }
        else {
            fprintf(stderr, "jwt_auth_plugin: auth ERROR! res=%ld\n", res);
            if (PyErr_Occurred())
            {
                PyErr_Print();
            }
            ret = MOSQ_ERR_UNKNOWN;
        }
    } else {
        fprintf(stderr, "jwt_auth_plugin: error!\n");
        if (PyErr_Occurred())
        {
            PyErr_Print();
        }
    }
    Py_DECREF(pArgs);
    Py_DECREF(pyResult_check_user_pass);

    return ret;
}

int mosquitto_auth_psk_key_get(void *user_data, const char *hint, const char *identity, char *key, int max_key_len)
{
    fprintf(stderr, "jwt_auth_plugin: psk key get ident=%s key=%s max_key_len=%i\n", identity, key, max_key_len);
    /* not needed */
    return 1; // returns >0 if this function is not required or on failure.
}
