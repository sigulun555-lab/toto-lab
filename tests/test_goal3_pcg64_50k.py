import math
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "analysis" / "goal3_outer_detail"))
import pcg64_50k_sensitivity as m

class TestPCG64Sensitivity(unittest.TestCase):
    def setUp(self):
        self.rows=[
            {"date":"2026-01-01","match":"a","actual":0,"p_k6":[.4,.3,.2,.1],"p_k10":[.35,.3,.2,.15]},
            {"date":"2026-01-01","match":"a","actual":1,"p_k6":[.2,.4,.2,.2],"p_k10":[.2,.35,.25,.2]},
            {"date":"2026-01-02","match":"b","actual":2,"p_k6":[.1,.2,.4,.3],"p_k10":[.1,.2,.35,.35]},
            {"date":"2026-01-02","match":"b","actual":3,"p_k6":[.1,.2,.3,.4],"p_k10":[.1,.2,.3,.4]},
        ]
    def test_scores_and_ece(self):
        s=m.scores(self.rows)
        self.assertEqual(set(s["delta_k6_minus_k10"]),{"brier","logloss","accuracy"})
        for k in (6,10):
            e=m.ece10(self.rows,k)
            self.assertEqual(len(e),4)
            self.assertTrue(all(0<=x["ece10"]<=1 for x in e))
    def test_date_bootstrap_deterministic(self):
        vals=m.row_deltas(self.rows)
        a=m.date_bootstrap(self.rows,vals,200,1)
        b=m.date_bootstrap(self.rows,vals,200,1)
        self.assertEqual(a,b)
        self.assertEqual(a["replicates"],200)
    def test_poisson_vector_reconstruction(self):
        rows=[]
        for date,actual in (("2026-01-01",0),("2026-01-02",1)):
            lam=1.2
            p=[math.exp(-lam),lam*math.exp(-lam),lam**2/2*math.exp(-lam),1-math.exp(-lam)*(1+lam+lam**2/2)]
            rows.append({"date":date,"actualGoals":actual,"actual":actual,"pByK":{"6":p,"10":p}})
        out=m.poisson(rows,200,1)
        self.assertLess(out["byK"]["6"]["maxPoissonVectorAbsError"],2e-8)
        self.assertAlmostEqual(out["dispersionDeltaK6MinusK10"]["mean"],0.0,places=12)

if __name__=="__main__": unittest.main()
