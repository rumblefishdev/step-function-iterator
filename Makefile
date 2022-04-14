STACK_NAME=step-functions-iterate
ARTIFACTS_BUCKET=artifacts-step-functions-iterate.rumblefish.dev
REGION=eu-west-1

CAPABILITIES=CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

.PHONY: deploy-staging

dist/index.js: src/index.ts
	npm run build

make-artifacts-bucket:
	aws s3 mb s3://$(ARTIFACTS_BUCKET) --region $(REGION)

deploy: dist/index.js
	sam deploy --template-file template.yml --stack-name $(STACK_NAME) --capabilities $(CAPABILITIES)  --region $(REGION) --s3-bucket $(ARTIFACTS_BUCKET)

destroy:
	aws cloudformation delete-stack --stack-name $(STACK_NAME)   --region $(REGION)
