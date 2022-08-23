# Clipbox-CDK

This repo will help you set up the infrastructure to use clipbox in your own AWS account:

- an S3 bucket to hold the files,
- a cloudfront distribution to serve and cache the files
- (optional) an SSL certificate and DNS records to use your own domain name.

## Configuration

No configuration is required. Without config, clips will be available via a cloudfront url, like https://d20uaaf6y4tcks.cloudfront.net, which is kinda long and ugly. It's possible to set your own domain name, with the `domainName` props. You must also do one of the following:

### Use a route53 hosted zone

This is the easiest option. You make AWS Route53 authority over your domain, and it creates the DNS records you need. First, [create a public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html), then add `hostedZoneDomain` to the props in bin/clipbox-cdk.ts.

### Set up your own ACM Certificate

Request an ACM certificate using [these instructions](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html). Make sure to create it in `us-east-1`, because cloudfront will only look in that region for certificates.

Then, grab the ARN of the certificate, and add it as `certificateArn` over in bin/clipbox-cdk.ts

Finally, after the stack is deployed, you'll need to add a CNAME from your `domainName` to the cloudfront distribution url. More specific instructions will be printed in the stack deploy output.

## Deploy

Update the values in bin/clipbox-cdk.ts, if you wish to change any of them.

1. Set up your AWS account, if necessary. Get AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY credentials, and set up the aws-cli: `aws configure`
1. `npx aws-cdk bootstrap`. This makes it possible to use cdk within this AWS account/region. It's not a problem to run it twice though.
1. `npx aws-cdk deploy`. Create the infrastructure, or update it to account for the latest settings.

The output from the deploy command will include

- A command to run to add a new aws-cli profile for clipbox-writer
- A line `export CLIPBOX_URL_PREFIX=...` to add to your shell startup script
- (possibly) a DNS record to add to your domain authority, to point your domain name to the cloudfront origin

## Wiring

Once you've deployed your stack, it's time to wire up the scripts to keybindings. You can do this however you like. I've used Alfred and Gnome keyboard setup, but most recently I'm using Raycast. It does everything I liked from Alfred, but it's also free.

Once you have it installed, [add the scripts directory from this repo to Raycast](https://github.com/raycast/script-commands#install-script-commands-from-this-repository). I recommend assigning keybindings to the commands. I use

| Keys            | Action                        |
| --------------- | ----------------------------- |
| &#8984;&#8679;X | Take screenshot               |
| &#8984;&#8679;C | Upload clipboard text or file |
