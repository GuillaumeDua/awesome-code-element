# Notes for contributors

## About testing

As-is, there is no  - *automated, non-regression* - tests implemented on the project yet.

As a duct-taped & temporary solution, you can use the following :

```bash
python3 -m http.server 8001
<chrome or firefox> http://localhost:8001/tests/per_usage/
```

