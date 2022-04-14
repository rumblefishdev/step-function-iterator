STAGING_STACK_NAME=step-functions-iterate
ARTIFACTS_BUCKET=artifacts-step-functions-iterate.rumblefish.dev
STAGING_REGION=eu-west-1

CAPABILITIES=CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

.PHONY: deploy-staging

dist/index.js: src/index.ts
	npm run build

make-artifacts-bucket:
	aws s3 mb s3://$(ARTIFACTS_BUCKET) --region $(STAGING_REGION)

deploy-staging: dist/index.js
	sam deploy --template-file template.yml --stack-name $(STAGING_STACK_NAME) --capabilities $(CAPABILITIES)  --region $(STAGING_REGION) --s3-bucket $(ARTIFACTS_BUCKET)

destroy:
	aws cloudformation delete-stack --stack-name $(STAGING_STACK_NAME)   --region $(STAGING_REGION)
