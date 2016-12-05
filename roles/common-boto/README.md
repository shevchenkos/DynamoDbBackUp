Boto
========================================

Role to centralize the AWS-Configuration

installation / configuration
----------------------------
The target should be to have ONE centralized Configuration for AWS-Access over the different Frontends (aws-cli, ansible, boto, ....)
This role tries to manage this by creating symlinks from only ~/.boto to the others.

Recommend way to access AWS over the different Frontends to the different Environments is to use PROFILES.
Each environment requires different Login-Data wich should ONLY be configured in ONE file called ~/.boto

