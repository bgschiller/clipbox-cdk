# Clipbox-CDK

This repo will help you set up the infrastructure to use clipbox in your own AWS account:

- an S3 bucket to hold the files,
- a cloudfront distribution to serve and cache the files
- (optional) an SSL certificate and DNS records to use your own domain name.

## Deploy

Update the values in bin/clipbox-cdk.ts, if you wish to change any of them. Don't worry about doing this right away though, you can always add them later and re-deploy.

1. Set up your AWS account, if necessary. Get AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY credentials, and set up the aws-cli: `aws configure`
1. `npx aws-cdk bootstrap`. This makes it possible to use cdk within this AWS account/region.
1. `npx aws-cdk deploy`. Create the infrastructure, or update it to account for the latest settings.

The output from the deploy command will include

- A command to run to add a new aws-cli profile for clipbox-writer
- A line `export CLIPBOX_URL_PREFIX=...` to add to your shell startup script
- (possibly) a DNS record to add to your domain authority, to point your domain name to the cloudfront origin

## Usage

The scripts directory has the following entry points:

- `clipbox-selection.sh`: Capture a selection of the screen and upload a png to S3. Put the public URL on your clipboard.
- `clipbox-text-or-file.sh`: If the active window is Finder, upload the highlighted file. Otherwise, upload the contents of the clipboard as text.
- `clipbox-annotate.sh`: Capture a selection of the screen and open it in Preview. When preview is quit, upload the (possibly annotated) screenshot to S3 and put the public URL on the clipboard.

While you can run these directly, it's much more common to wire them up to a launcher like [Raycast](https://www.raycast.com/).

### Wiring

Once you've deployed your stack, it's time to wire up the scripts to keybindings. You can do this however you like. I've used Alfred and Gnome keyboard setup, but most recently I'm using [Raycast](https://www.raycast.com/). It does everything I liked from Alfred, but it's also free.

Once you have it installed, [add the scripts directory from this repo to Raycast](https://github.com/raycast/script-commands#install-script-commands-from-this-repository). I recommend assigning keybindings to the commands. I use

| Keys            | Action                        |
| --------------- | ----------------------------- |
| &#8984;&#8679;X | Take screenshot               |
| &#8984;&#8679;C | Upload clipboard text or file |

## Configuration

No configuration is required. Without config, clips will be available via a cloudfront url, like https://d20uaaf6y4tcks.cloudfront.net, which is kinda long and ugly. It's possible to set your own domain name, with the `domainName` props. You must also do one of the following:

### Let AWS manage your DNS records and Certificate

This is the easiest option, but it's only available if AWS manages your DNS (not likely if you bought the domain somewhere else, like google domains, namecheap, or godaddy). AWS Route53 has authority over your domain, and it creates the DNS records you need. First, [create a public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html), then add `hostedZoneDomain` to the props in bin/clipbox-cdk.ts.

### Set up your own ACM Certificate

This option is a better option if your domain's DNS servers are somewhere else. Here's the mental model for how it works:

1. Cloudfront needs an SSL Request for your domain (eg, `clip.yourname.com`) to securely serve requests.
2. Request an ACM certificate from Amazon, making sure to request it in us-east-1. "AWS, please make me a cert to sign requests to/from `clip.yourname.com`"
3. AWS will ask if you want DNS verification or email. I recommend DNS. They are saying "We want to make sure that only the person who owns `clip.yourname.com` has access to that certificate. Can you prove that you own it?" They will ask you to create a couple of DNS TXT records, as a challenge to prove you have control over the domain.
4. You create those DNS records on google domains or namecheap or godaddy. You're telling AWS, "Look, I really do have control over `clip.yourname.com`.
5. AWS is watching to see if those DNS TXT records show up. When they do appear, they issue you a certificate.
6. You take the identifier of that certificate, the ARN, and add it as the `certificateArn` in bin/clipbox-cdk.ts. You're telling AWS: "I have a certificate all set up for Cloudfront to secure requests to `clip.yourname.com`. Here it is, please use it."

Here are some more detail instructions from Amazon: https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html . Again, please be careful to use `us-east-1`, or your deploy will fail.

Then, grab the ARN of the certificate, and add it as `certificateArn` over in bin/clipbox-cdk.ts

Finally, after the stack is deployed, you'll need to add a CNAME from your `domainName` to the cloudfront distribution url. More specific instructions will be printed in the stack deploy output. You're saying to your DNS registrar, "When a user requests `clip.yourname.com`, please send their traffic to `<cloudfront-domain-subdomain>.cloudfront.net`.
