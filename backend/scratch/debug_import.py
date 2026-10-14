import sys
import pydantic._internal._generate_schema as gs

orig = gs.GenerateSchema._resolve_forward_ref
def dbg(self, a):
    arg = getattr(a, '__forward_arg__', str(a))
    if arg == 'StartAssessmentRequest':
        print('DBG: forward_arg:', arg)
        print('DBG: _types_namespace type:', type(self._types_namespace))
        if self._types_namespace:
            print('DBG: in namespace?', 'StartAssessmentRequest' in self._types_namespace)
            print('DBG: namespace sample keys:', list(self._types_namespace.keys())[:10])
    return orig(self, a)

gs.GenerateSchema._resolve_forward_ref = dbg

try:
    import routers.api
    print('Import successful!')
except Exception as e:
    import traceback
    traceback.print_exc()
